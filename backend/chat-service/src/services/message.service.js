import crypto from "node:crypto";
import { MessageModel } from "../models/message.model.js";
import { ConversationModel } from "../models/conversation.model.js";
import { CustomerModel } from "../models/customer.model.js";
import { ConversationService, requirePermission } from "./conversation.service.js";
import {
  uploadChatFile,
  uploadMultipleChatFiles,
  getMessageTypeFromMime,
  determineOverallMessageType,
  generatePreviewText,
} from "./storage.service.js";
import { ReactionService } from "./reaction.service.js";

export const MessageService = {
  // Lấy danh sách tin nhắn theo cuộc trò chuyện
  getMessages: async (user, id, { before, limit = 10 } = {}) => {
    await ConversationService.getAccessible(user, id);
    limit = Number(limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw { status: 400, message: "Phân trang tin nhắn không hợp lệ!" };
    }
    return MessageModel.findByConversation(id, before, limit);
  },

  /**
   * Chức năng gửi 1 tin nhắn loại text:
   * - Nếu chưa có cuộc hội thoại thì tạo cuộc hội thoại mới và tạo tin nhắn mới
   * - Nếu đã có cuộc hội thoại thì chỉ cần thêm tin nhắn mới vào hội thoại
   *
   * @param {Object} user - Thông tin người dùng đăng nhập (từ token)
   * @param {Object} payload - { conversation_id, customer_id, content, reply_to_message_id, sender_type, file, file_url }
   */
  sendTextMessage: async (
    user,
    {
      conversation_id,
      customer_id,
      content,
      reply_to_message_id = null,
      sender_type = "user",
      files = null,
      file = null,
      attachments = [],
      file_url = null,
      file_urls = null,
      file_name = null,
      file_size = null,
      file_type = null,
      message_type = "text",
    } = {}
  ) => {
    // Nếu có file, files, attachments hoặc file_url truyền vào, chuyển tiếp sang sendMediaMessage
    const hasAttachments =
      (Array.isArray(files) && files.length > 0) ||
      file ||
      (Array.isArray(attachments) && attachments.length > 0) ||
      file_url ||
      (Array.isArray(file_urls) && file_urls.length > 0) ||
      (message_type && message_type !== "text");

    if (hasAttachments) {
      return MessageService.sendMediaMessage(user, {
        conversation_id,
        customer_id,
        content,
        reply_to_message_id,
        sender_type,
        files,
        file,
        attachments,
        file_url,
        file_urls,
        file_name,
        file_size,
        file_type,
        message_type: message_type === "text" ? null : message_type,
      });
    }

    // 1. Kiểm tra nội dung tin nhắn
    if (typeof content !== "string" || !content.trim()) {
      throw { status: 400, message: "Nội dung tin nhắn không được để trống!" };
    }
    const cleanContent = content.trim();
    if (cleanContent.length > 2000) {
      throw { status: 400, message: "Tin nhắn không được vượt quá 2000 ký tự!" };
    }

    // 2. Xác định người gửi
    const senderId = String(user?.accountId || user?.account_id || user?.id || "");
    if (!senderId) {
      throw { status: 401, message: "Không xác định được thông tin người gửi!" };
    }
    const userRole = user?.role || "customer";
    const isCustomer = userRole === "customer";

    // Nếu là nhân viên hoặc admin, kiểm tra quyền chat:reply
    if (!isCustomer) {
      requirePermission(user, "chat:reply");
    }

    // 3. Tìm cuộc hội thoại tương ứng
    let conversation = null;
    let isNewConversation = false;

    // A. Nếu client truyền conversation_id, tìm theo conversation_id trước
    if (conversation_id) {
      conversation = await ConversationModel.findById(conversation_id);

      // Nếu là khách hàng, đảm bảo cuộc hội thoại thuộc về chính khách hàng đó
      if (conversation && isCustomer && String(conversation.customer_id) !== senderId) {
        throw { status: 403, message: "Bạn không có quyền gửi tin nhắn vào hội thoại này!" };
      }
    }

    // B. Nếu chưa tìm thấy hội thoại (hoặc không truyền conversation_id)
    if (!conversation) {
      const targetCustomerId = isCustomer ? senderId : (customer_id || null);

      if (targetCustomerId) {
        // Tìm cuộc hội thoại còn đang mở của khách hàng
        conversation = await ConversationModel.findOpenByCustomerId(String(targetCustomerId));
      }
    }

    const now = new Date().toISOString();

    // 4. NẾU CHƯA CÓ CUỘC HỘI THOẠI: TẠO CUỘC HỘI THOẠI MỚI VÀ TẠO TIN NHẮN MỚI
    if (!conversation) {
      isNewConversation = true;
      const targetCustomerId = isCustomer ? senderId : String(customer_id || senderId);

      // Lấy thông tin khách hàng để gán customer_name
      let customerName = "Khách hàng";
      try {
        const customerProfile = await CustomerModel.findByAccountId(targetCustomerId);
        if (customerProfile?.full_name && customerProfile.full_name !== "Khách hàng") {
          customerName = customerProfile.full_name;
        } else if (isCustomer && (user?.full_name || user?.username)) {
          customerName = user.full_name || user.username;
        }
      } catch {
        if (isCustomer && (user?.full_name || user?.username)) {
          customerName = user.full_name || user.username;
        }
      }

      const newConversationId = conversation_id || crypto.randomUUID();

      conversation = await ConversationModel.create({
        conversation_id: newConversationId,
        customer_id: targetCustomerId,
        customer_name: customerName,
        status: "pending",
        last_message: cleanContent,
        last_message_at: now,
      });

      // Thêm khách hàng vào bảng conversation_participants
      try {
        await ConversationModel.addParticipant({
          conversation_id: conversation.conversation_id,
          account_id: targetCustomerId,
          role: "customer",
          last_read_at: now,
        });
      } catch (err) {
        console.warn("[MessageService] Warning adding customer to participants:", err.message);
      }

      // Nếu người gửi là nhân viên / admin tạo hội thoại hỗ trợ khách hàng, thêm staff vào participants
      if (!isCustomer && senderId !== targetCustomerId) {
        try {
          await ConversationModel.addParticipant({
            conversation_id: conversation.conversation_id,
            account_id: senderId,
            role: userRole,
            last_read_at: now,
          });
        } catch (err) {
          console.warn("[MessageService] Warning adding staff to participants:", err.message);
        }
      }
    } else {
      // 5. NẾU ĐÃ CÓ CUỘC HỘI THOẠI:
      // - Nếu hội thoại đã đóng mà khách hàng nhắn tiếp -> mở lại trạng thái pending
      if (conversation.status === "closed") {
        if (isCustomer) {
          try {
            await ConversationModel.update(conversation.conversation_id, {
              status: "pending",
            });
            conversation.status = "pending";
          } catch (err) {
            console.warn("[MessageService] Warning reopening closed conversation:", err.message);
          }
        } else {
          throw {
            status: 400,
            message: "Cuộc trò chuyện đã đóng! Vui lòng nhận xử lý cuộc trò chuyện trước khi gửi tin nhắn.",
          };
        }
      }

      // - Nếu nhân viên trả lời và hội thoại đang chờ hỗ trợ (pending/waiting) -> chuyển sang processing
      if (!isCustomer && (conversation.status === "pending" || conversation.status === "waiting")) {
        try {
          await ConversationModel.update(conversation.conversation_id, {
            status: "processing",
          });
          conversation.status = "processing";
        } catch (err) {
          console.warn("[MessageService] Warning updating status to processing:", err.message);
        }
      }
    }

    // 6. TẠO TIN NHẮN MỚI LOẠI TEXT TRONG BẢNG messages
    const messageId = crypto.randomUUID();
    const createdMessage = await MessageModel.create({
      messageId,
      conversationId: conversation.conversation_id,
      senderId: sender_type === "ai" || sender_type === "system" ? null : senderId,
      senderType: sender_type || "user",
      messageType: "text",
      content: cleanContent,
      replyToMessageId: reply_to_message_id || null,
      status: "sent",
    });

    const messageCreatedAt = createdMessage.created_at || now;

    // 7. CẬP NHẬT THÔNG TIN TIN NHẮN CUỐI CÙNG TRONG BẢNG conversations
    try {
      await ConversationModel.update(conversation.conversation_id, {
        last_message_id: createdMessage.message_id,
        last_message: cleanContent,
        last_message_at: messageCreatedAt,
      });
      conversation.last_message_id = createdMessage.message_id;
      conversation.last_message = cleanContent;
      conversation.last_message_at = messageCreatedAt;
    } catch (err) {
      console.warn("[MessageService] Warning updating last_message in conversation:", err.message);
    }

    // 8. CẬP NHẬT TRẠNG THÁI ĐÃ ĐỌC CHO NGƯỜI GỬI TRONG BẢNG conversation_participants
    try {
      await ConversationModel.upsertParticipant({
        conversation_id: conversation.conversation_id,
        account_id: senderId,
        role: isCustomer ? "customer" : userRole,
        last_read_message_id: createdMessage.message_id,
        last_read_at: messageCreatedAt,
      });
    } catch (err) {
      console.warn("[MessageService] Warning updating sender in conversation_participants:", err.message);
    }

    // 9. CHUẨN HÓA DỮ LIỆU TIN NHẮN TRẢ VỀ
    let replyToData = null;
    if (createdMessage.reply_to_message_id) {
      try {
        const parentMsg = await MessageModel.findById(createdMessage.reply_to_message_id);
        if (parentMsg) {
          replyToData = {
            message_id: parentMsg.message_id,
            conversation_id: parentMsg.conversation_id,
            sender_id: parentMsg.sender_id,
            sender_type: parentMsg.sender_type || "user",
            sender_role:
              parentMsg.sender_id === conversation.customer_id
                ? "customer"
                : parentMsg.sender_type === "ai"
                  ? "ai"
                  : "staff",
            message_type: parentMsg.message_type || "text",
            content: parentMsg.content,
            attachments: parentMsg.attachments || [],
            created_at: parentMsg.created_at,
          };
        }
      } catch (err) {
        console.warn("[MessageService.sendTextMessage] Warning loading reply_to parent:", err.message);
      }
    }

    const formattedMessage = {
      message_id: createdMessage.message_id,
      conversation_id: createdMessage.conversation_id,
      sender_id: createdMessage.sender_id,
      sender_type: createdMessage.sender_type || "user",
      sender_role: isCustomer ? "customer" : userRole === "admin" ? "admin" : "staff",
      message_type: "text",
      content: createdMessage.content,
      attachments: [],
      reply_to_message_id: createdMessage.reply_to_message_id || null,
      reply_to: replyToData,
      status: createdMessage.status || "sent",
      is_read: true,
      created_at: createdMessage.created_at,
      updated_at: createdMessage.updated_at || createdMessage.created_at,
    };

    return {
      message: formattedMessage,
      reply_to: replyToData,
      conversation,
      is_new_conversation: isNewConversation,
    };
  },

  /**
   * Chức năng gửi tin nhắn loại hình ảnh, video, file / tệp đính kèm:
   * - Hỗ trợ gửi nhiều ảnh, video, tệp tin cùng lúc
   * - Hỗ trợ cả nhận files tải lên từ Multer hoặc danh sách file_url/attachments đã có sẵn
   * - Tự động upload song song lên Supabase Storage và phân loại media
   * - Tự động tạo cuộc hội thoại mới nếu khách hàng chưa có hội thoại mở
   *
   * @param {Object} user - Thông tin người dùng đăng nhập
   * @param {Object} payload - {
   *   conversation_id,
   *   customer_id,
   *   files,
   *   file,
   *   attachments,
   *   file_urls,
   *   file_url,
   *   file_name,
   *   file_size,
   *   file_type,
   *   message_type,
   *   content,
   *   caption,
   *   reply_to_message_id,
   *   sender_type
   * }
   */
  sendMediaMessage: async (
    user,
    {
      conversation_id,
      customer_id,
      files = null,
      file = null,
      attachments = [],
      file_url = null,
      file_urls = null,
      file_name = null,
      file_size = null,
      file_type = null,
      message_type = null,
      content = "",
      caption = "",
      reply_to_message_id = null,
      sender_type = "user",
    } = {}
  ) => {
    // 1. Xác thực người gửi
    const senderId = String(user?.accountId || user?.account_id || user?.id || "");
    if (!senderId) {
      throw { status: 401, message: "Không xác định được thông tin người gửi!" };
    }
    const userRole = user?.role || "customer";
    const isCustomer = userRole === "customer";

    // Nếu là nhân viên hoặc admin, kiểm tra quyền chat:reply
    if (!isCustomer) {
      requirePermission(user, "chat:reply");
    }

    // 2. Thu thập danh sách file từ Multer
    let rawFiles = [];
    if (Array.isArray(files) && files.length > 0) {
      rawFiles = files.filter((f) => f && (f.buffer || f.path));
    } else if (file && (file.buffer || file.path)) {
      rawFiles = [file];
    }

    // 3. Upload tất cả file tải lên song song lên Supabase Storage
    let uploadedAttachments = [];
    if (rawFiles.length > 0) {
      uploadedAttachments = await uploadMultipleChatFiles(rawFiles);
    }

    // 4. Tổng hợp danh sách attachments cuối cùng
    const finalAttachments = [...uploadedAttachments];

    // Bổ sung các attachments dạng object truyền qua body (nếu có)
    if (Array.isArray(attachments) && attachments.length > 0) {
      attachments.forEach((att) => {
        if (att && (att.file_url || att.fileUrl)) {
          finalAttachments.push({
            file_url: att.file_url || att.fileUrl,
            file_name: att.file_name || att.fileName || "file",
            file_size: att.file_size != null ? Number(att.file_size) : (att.fileSize != null ? Number(att.fileSize) : null),
            file_type: att.file_type || att.fileType || "application/octet-stream",
            message_type: att.message_type || att.messageType || getMessageTypeFromMime(att.file_type || att.fileType, att.file_name || att.fileName),
          });
        }
      });
    }

    // Bổ sung file_urls (mảng các url) nếu có
    if (Array.isArray(file_urls) && file_urls.length > 0) {
      file_urls.forEach((url) => {
        if (url && typeof url === "string" && !finalAttachments.some((a) => a.file_url === url)) {
          finalAttachments.push({
            file_url: url,
            file_name: url.split("/").pop()?.split("?")[0] || "file",
            file_size: null,
            file_type: "application/octet-stream",
            message_type: getMessageTypeFromMime("", url),
          });
        }
      });
    }

    // Bổ sung file_url đơn lẻ nếu có
    if (file_url && typeof file_url === "string" && !finalAttachments.some((a) => a.file_url === file_url)) {
      finalAttachments.push({
        file_url,
        file_name: file_name || file_url.split("/").pop()?.split("?")[0] || "file",
        file_size: file_size ? Number(file_size) : null,
        file_type: file_type || "application/octet-stream",
        message_type: message_type || getMessageTypeFromMime(file_type, file_name || file_url),
      });
    }

    if (finalAttachments.length === 0) {
      throw {
        status: 400,
        message: "Vui lòng đính kèm ít nhất một tệp tin (hình ảnh, video, tài liệu) hoặc cung cấp đường dẫn tệp!",
      };
    }

    // 5. Xác định message_type
    let finalMessageType = message_type;
    if (!finalMessageType || finalMessageType === "text") {
      finalMessageType = determineOverallMessageType(finalAttachments);
    }

    // 6. Chuẩn bị nội dung hiển thị & văn bản tóm tắt cho cuộc hội thoại
    const textCaption = typeof (content || caption) === "string" ? (content || caption).trim() : "";
    const previewText = generatePreviewText(finalAttachments, textCaption);
    const messageContent = textCaption || previewText;

    // 7. Tìm cuộc hội thoại tương ứng
    let conversation = null;
    let isNewConversation = false;

    if (conversation_id) {
      conversation = await ConversationModel.findById(conversation_id);
      if (conversation && isCustomer && String(conversation.customer_id) !== senderId) {
        throw { status: 403, message: "Bạn không có quyền gửi tin nhắn vào hội thoại này!" };
      }
    }

    if (!conversation) {
      const targetCustomerId = isCustomer ? senderId : (customer_id || null);
      if (targetCustomerId) {
        conversation = await ConversationModel.findOpenByCustomerId(String(targetCustomerId));
      }
    }

    const now = new Date().toISOString();

    // Nếu chưa có cuộc hội thoại, tự động tạo mới
    if (!conversation) {
      isNewConversation = true;
      const targetCustomerId = isCustomer ? senderId : String(customer_id || senderId);

      let customerName = "Khách hàng";
      try {
        const customerProfile = await CustomerModel.findByAccountId(targetCustomerId);
        if (customerProfile?.full_name && customerProfile.full_name !== "Khách hàng") {
          customerName = customerProfile.full_name;
        } else if (isCustomer && (user?.full_name || user?.username)) {
          customerName = user.full_name || user.username;
        }
      } catch {
        if (isCustomer && (user?.full_name || user?.username)) {
          customerName = user.full_name || user.username;
        }
      }

      const newConversationId = conversation_id || crypto.randomUUID();

      conversation = await ConversationModel.create({
        conversation_id: newConversationId,
        customer_id: targetCustomerId,
        customer_name: customerName,
        status: "pending",
        last_message: previewText,
        last_message_at: now,
      });

      try {
        await ConversationModel.addParticipant({
          conversation_id: conversation.conversation_id,
          account_id: targetCustomerId,
          role: "customer",
          last_read_at: now,
        });
      } catch (err) {
        console.warn("[MessageService] Warning adding customer participant:", err.message);
      }

      if (!isCustomer && senderId !== targetCustomerId) {
        try {
          await ConversationModel.addParticipant({
            conversation_id: conversation.conversation_id,
            account_id: senderId,
            role: userRole,
            last_read_at: now,
          });
        } catch (err) {
          console.warn("[MessageService] Warning adding staff participant:", err.message);
        }
      }
    } else {
      if (conversation.status === "closed") {
        if (isCustomer) {
          try {
            await ConversationModel.update(conversation.conversation_id, { status: "pending" });
            conversation.status = "pending";
          } catch (err) {
            console.warn("[MessageService] Warning reopening closed conversation:", err.message);
          }
        } else {
          throw {
            status: 400,
            message: "Cuộc trò chuyện đã đóng! Vui lòng nhận xử lý cuộc trò chuyện trước khi gửi tệp tin.",
          };
        }
      }

      if (!isCustomer && (conversation.status === "pending" || conversation.status === "waiting")) {
        try {
          await ConversationModel.update(conversation.conversation_id, { status: "processing" });
          conversation.status = "processing";
        } catch (err) {
          console.warn("[MessageService] Warning updating status to processing:", err.message);
        }
      }
    }

    // 8. Lưu tin nhắn vào bảng messages và toàn bộ attachments vào bảng message_attachments
    const messageId = crypto.randomUUID();
    const firstAtt = finalAttachments.length > 0 ? finalAttachments[0] : null;

    const createdMessage = await MessageModel.create({
      messageId,
      conversationId: conversation.conversation_id,
      senderId: sender_type === "ai" || sender_type === "system" ? null : senderId,
      senderType: sender_type || "user",
      messageType: finalMessageType,
      content: messageContent,
      attachments: finalAttachments,
      fileUrl: firstAtt?.file_url || null,
      fileName: firstAtt?.file_name || null,
      fileSize: firstAtt?.file_size || null,
      fileType: firstAtt?.file_type || null,
      replyToMessageId: reply_to_message_id || null,
      status: "sent",
    });

    const messageCreatedAt = createdMessage.created_at || now;

    // 9. Cập nhật last_message của hội thoại
    try {
      await ConversationModel.update(conversation.conversation_id, {
        last_message_id: createdMessage.message_id,
        last_message: previewText,
        last_message_at: messageCreatedAt,
      });
      conversation.last_message_id = createdMessage.message_id;
      conversation.last_message = previewText;
      conversation.last_message_at = messageCreatedAt;
    } catch (err) {
      console.warn("[MessageService] Warning updating last_message in conversation:", err.message);
    }

    // 10. Cập nhật trạng thái đã xem cho người gửi
    try {
      await ConversationModel.upsertParticipant({
        conversation_id: conversation.conversation_id,
        account_id: senderId,
        role: isCustomer ? "customer" : userRole,
        last_read_message_id: createdMessage.message_id,
        last_read_at: messageCreatedAt,
      });
    } catch (err) {
      console.warn("[MessageService] Warning updating participant read status:", err.message);
    }

    // 11. Định dạng dữ liệu tin nhắn trả về cho client
    let replyToData = null;
    if (createdMessage.reply_to_message_id) {
      try {
        const parentMsg = await MessageModel.findById(createdMessage.reply_to_message_id);
        if (parentMsg) {
          replyToData = {
            message_id: parentMsg.message_id,
            conversation_id: parentMsg.conversation_id,
            sender_id: parentMsg.sender_id,
            sender_type: parentMsg.sender_type || "user",
            sender_role:
              parentMsg.sender_id === conversation.customer_id
                ? "customer"
                : parentMsg.sender_type === "ai"
                  ? "ai"
                  : "staff",
            message_type: parentMsg.message_type || "text",
            content: parentMsg.content,
            attachments: parentMsg.attachments || [],
            created_at: parentMsg.created_at,
          };
        }
      } catch (err) {
        console.warn("[MessageService.sendMediaMessage] Warning loading reply_to parent:", err.message);
      }
    }

    const savedAtts = createdMessage.attachments || [];
    const mainAtt = savedAtts.length > 0 ? savedAtts[0] : null;

    const formattedMessage = {
      message_id: createdMessage.message_id,
      conversation_id: createdMessage.conversation_id,
      sender_id: createdMessage.sender_id,
      sender_type: createdMessage.sender_type || "user",
      sender_role: isCustomer ? "customer" : userRole === "admin" ? "admin" : "staff",
      message_type: finalMessageType,
      content: createdMessage.content,
      attachments: savedAtts,
      file_url: mainAtt?.file_url || null,
      file_name: mainAtt?.file_name || null,
      file_size: mainAtt?.file_size || null,
      file_type: mainAtt?.file_type || null,
      reply_to_message_id: createdMessage.reply_to_message_id || null,
      reply_to: replyToData,
      status: createdMessage.status || "sent",
      is_read: true,
      created_at: createdMessage.created_at,
      updated_at: createdMessage.updated_at || createdMessage.created_at,
    };

    return {
      message: formattedMessage,
      reply_to: replyToData,
      conversation,
      is_new_conversation: isNewConversation,
    };
  },

  /**
   * Chức năng trả lời (reply) một tin nhắn cụ thể
   * Hỗ trợ trả lời kèm văn bản và nhiều ảnh, video, tệp tin đính kèm
   */
  replyMessage: async (
    user,
    {
      reply_to_message_id,
      content = "",
      caption = "",
      message_type = null,
      sender_type = "user",
      files = null,
      file = null,
      attachments = [],
      file_url = null,
      file_urls = null,
      file_name = null,
      file_size = null,
      file_type = null,
      conversation_id = null,
    } = {}
  ) => {
    // 1. Kiểm tra tham số reply_to_message_id
    if (!reply_to_message_id) {
      throw { status: 400, message: "Vui lòng cung cấp ID tin nhắn cần trả lời (reply_to_message_id)!" };
    }

    // 2. Tìm tin nhắn gốc cần reply
    const parentMessage = await MessageModel.findById(reply_to_message_id);
    if (!parentMessage) {
      throw { status: 404, message: "Không tìm thấy tin nhắn cần trả lời!" };
    }

    // Xác định cuộc trò chuyện từ tin nhắn gốc
    const targetConversationId = parentMessage.conversation_id;
    if (conversation_id && String(conversation_id) !== String(targetConversationId)) {
      throw {
        status: 400,
        message: "Tin nhắn được trả lời không thuộc về cuộc hội thoại này!",
      };
    }

    // 3. Xác thực người gửi và quyền hạn
    const senderId = String(user?.accountId || user?.account_id || user?.id || "");
    if (!senderId) {
      throw { status: 401, message: "Không xác định được thông tin người gửi!" };
    }
    const userRole = user?.role || "customer";
    const isCustomer = userRole === "customer";

    if (!isCustomer) {
      requirePermission(user, "chat:reply");
    }

    // 4. Tìm và kiểm tra quyền truy cập cuộc trò chuyện
    const conversation = await ConversationModel.findById(targetConversationId);
    if (!conversation) {
      throw { status: 404, message: "Không tìm thấy cuộc trò chuyện của tin nhắn này!" };
    }

    if (isCustomer && String(conversation.customer_id) !== senderId) {
      throw { status: 403, message: "Bạn không có quyền trả lời tin nhắn trong cuộc trò chuyện này!" };
    }

    // 5. Kiểm tra trạng thái cuộc trò chuyện
    if (conversation.status === "closed") {
      if (isCustomer) {
        try {
          await ConversationModel.update(conversation.conversation_id, { status: "pending" });
          conversation.status = "pending";
        } catch (err) {
          console.warn("[MessageService.replyMessage] Warning reopening conversation:", err.message);
        }
      } else {
        throw {
          status: 400,
          message: "Cuộc trò chuyện đã đóng! Vui lòng nhận xử lý cuộc trò chuyện trước khi gửi tin nhắn.",
        };
      }
    }

    if (!isCustomer && (conversation.status === "pending" || conversation.status === "waiting")) {
      try {
        await ConversationModel.update(conversation.conversation_id, { status: "processing" });
        conversation.status = "processing";
      } catch (err) {
        console.warn("[MessageService.replyMessage] Warning updating status to processing:", err.message);
      }
    }

    // 6. Xử lý danh sách tệp đính kèm (nếu có)
    let rawFiles = [];
    if (Array.isArray(files) && files.length > 0) {
      rawFiles = files.filter((f) => f && (f.buffer || f.path));
    } else if (file && (file.buffer || file.path)) {
      rawFiles = [file];
    }

    let uploadedAttachments = [];
    if (rawFiles.length > 0) {
      uploadedAttachments = await uploadMultipleChatFiles(rawFiles);
    }

    const finalAttachments = [...uploadedAttachments];

    if (Array.isArray(attachments) && attachments.length > 0) {
      attachments.forEach((att) => {
        if (att && (att.file_url || att.fileUrl)) {
          finalAttachments.push({
            file_url: att.file_url || att.fileUrl,
            file_name: att.file_name || att.fileName || "file",
            file_size: att.file_size != null ? Number(att.file_size) : (att.fileSize != null ? Number(att.fileSize) : null),
            file_type: att.file_type || att.fileType || "application/octet-stream",
            message_type: att.message_type || att.messageType || getMessageTypeFromMime(att.file_type || att.fileType, att.file_name || att.fileName),
          });
        }
      });
    }

    if (Array.isArray(file_urls) && file_urls.length > 0) {
      file_urls.forEach((url) => {
        if (url && typeof url === "string" && !finalAttachments.some((a) => a.file_url === url)) {
          finalAttachments.push({
            file_url: url,
            file_name: url.split("/").pop()?.split("?")[0] || "file",
            file_size: null,
            file_type: "application/octet-stream",
            message_type: getMessageTypeFromMime("", url),
          });
        }
      });
    }

    if (file_url && typeof file_url === "string" && !finalAttachments.some((a) => a.file_url === file_url)) {
      finalAttachments.push({
        file_url,
        file_name: file_name || file_url.split("/").pop()?.split("?")[0] || "file",
        file_size: file_size ? Number(file_size) : null,
        file_type: file_type || "application/octet-stream",
        message_type: message_type || getMessageTypeFromMime(file_type, file_name || file_url),
      });
    }

    const textContent = typeof (content || caption) === "string" ? (content || caption).trim() : "";

    if (finalAttachments.length === 0 && !textContent) {
      throw { status: 400, message: "Nội dung tin nhắn trả lời không được để trống!" };
    }
    if (textContent.length > 2000) {
      throw { status: 400, message: "Tin nhắn trả lời không được vượt quá 2000 ký tự!" };
    }

    let finalMessageType = message_type;
    if (!finalMessageType || finalMessageType === "text") {
      finalMessageType = finalAttachments.length > 0 ? determineOverallMessageType(finalAttachments) : "text";
    }

    const previewText = finalAttachments.length > 0 ? generatePreviewText(finalAttachments, textContent) : textContent;
    const messageContent = textContent || previewText;

    // 7. Lưu tin nhắn vào bảng messages và message_attachments
    const now = new Date().toISOString();
    const messageId = crypto.randomUUID();
    const firstAtt = finalAttachments.length > 0 ? finalAttachments[0] : null;

    const createdMessage = await MessageModel.create({
      messageId,
      conversationId: conversation.conversation_id,
      senderId: sender_type === "ai" || sender_type === "system" ? null : senderId,
      senderType: sender_type || "user",
      messageType: finalMessageType,
      content: messageContent,
      attachments: finalAttachments,
      fileUrl: firstAtt?.file_url || null,
      fileName: firstAtt?.file_name || null,
      fileSize: firstAtt?.file_size || null,
      fileType: firstAtt?.file_type || null,
      replyToMessageId: parentMessage.message_id,
      status: "sent",
    });

    const messageCreatedAt = createdMessage.created_at || now;

    // 8. Cập nhật last_message của hội thoại
    try {
      await ConversationModel.update(conversation.conversation_id, {
        last_message_id: createdMessage.message_id,
        last_message: previewText,
        last_message_at: messageCreatedAt,
      });
      conversation.last_message_id = createdMessage.message_id;
      conversation.last_message = previewText;
      conversation.last_message_at = messageCreatedAt;
    } catch (err) {
      console.warn("[MessageService.replyMessage] Warning updating conversation last_message:", err.message);
    }

    // 9. Cập nhật trạng thái đã xem cho người gửi
    try {
      await ConversationModel.upsertParticipant({
        conversation_id: conversation.conversation_id,
        account_id: senderId,
        role: isCustomer ? "customer" : userRole,
        last_read_message_id: createdMessage.message_id,
        last_read_at: messageCreatedAt,
      });
    } catch (err) {
      console.warn("[MessageService.replyMessage] Warning updating participant read status:", err.message);
    }

    // 10. Định dạng thông tin tin nhắn gốc và tin nhắn mới trả về
    const replyToData = {
      message_id: parentMessage.message_id,
      conversation_id: parentMessage.conversation_id,
      sender_id: parentMessage.sender_id,
      sender_type: parentMessage.sender_type || "user",
      sender_role:
        parentMessage.sender_id === conversation.customer_id
          ? "customer"
          : parentMessage.sender_type === "ai"
            ? "ai"
            : "staff",
      message_type: parentMessage.message_type || "text",
      content: parentMessage.content,
      attachments: parentMessage.attachments || [],
      created_at: parentMessage.created_at,
    };

    const savedAtts = createdMessage.attachments || [];
    const mainAtt = savedAtts.length > 0 ? savedAtts[0] : null;

    const formattedMessage = {
      message_id: createdMessage.message_id,
      conversation_id: createdMessage.conversation_id,
      sender_id: createdMessage.sender_id,
      sender_type: createdMessage.sender_type || "user",
      sender_role: isCustomer ? "customer" : userRole === "admin" ? "admin" : "staff",
      message_type: finalMessageType,
      content: createdMessage.content,
      attachments: savedAtts,
      file_url: mainAtt?.file_url || null,
      file_name: mainAtt?.file_name || null,
      file_size: mainAtt?.file_size || null,
      file_type: mainAtt?.file_type || null,
      reply_to_message_id: parentMessage.message_id,
      reply_to: replyToData,
      status: createdMessage.status || "sent",
      is_read: true,
      created_at: createdMessage.created_at,
      updated_at: createdMessage.updated_at || createdMessage.created_at,
    };

    return {
      message: formattedMessage,
      reply_to: replyToData,
      conversation,
    };
  },

  /**
   * Chức năng gửi nhiều tin nhắn media riêng biệt cùng một lúc (mỗi tệp tin thành 1 tin nhắn)
   */
  sendMultipleMediaMessages: async (
    user,
    {
      conversation_id,
      customer_id,
      files = [],
      attachments = [],
      content = "",
      caption = "",
      reply_to_message_id = null,
      sender_type = "user",
    } = {}
  ) => {
    let rawFiles = [];
    if (Array.isArray(files) && files.length > 0) {
      rawFiles = files.filter((f) => f && (f.buffer || f.path));
    }

    let uploaded = [];
    if (rawFiles.length > 0) {
      uploaded = await uploadMultipleChatFiles(rawFiles);
    }

    const allAttachments = [...uploaded, ...(Array.isArray(attachments) ? attachments : [])];
    if (allAttachments.length === 0) {
      throw { status: 400, message: "Không có tệp đính kèm nào được tải lên!" };
    }

    const textCaption = typeof (content || caption) === "string" ? (content || caption).trim() : "";
    const createdMessages = [];
    let conversation = null;
    let isNewConv = false;

    for (let i = 0; i < allAttachments.length; i++) {
      const att = allAttachments[i];
      const isFirst = i === 0;
      const singleContent = isFirst && textCaption ? textCaption : "";

      const result = await MessageService.sendMediaMessage(user, {
        conversation_id: conversation ? conversation.conversation_id : conversation_id,
        customer_id,
        attachments: [att],
        content: singleContent,
        reply_to_message_id: isFirst ? reply_to_message_id : null,
        sender_type,
      });

      conversation = result.conversation;
      if (result.is_new_conversation) isNewConv = true;
      createdMessages.push(result.message);
    }

    return {
      messages: createdMessages,
      conversation,
      is_new_conversation: isNewConv,
    };
  },

  // Alias tương thích ngược cho hàm send cũ
  send: async (user, id, data) => {
    if (data?.file || data?.file_url || (data?.message_type && data?.message_type !== "text")) {
      return MessageService.sendMediaMessage(user, {
        ...data,
        conversation_id: id,
      });
    }
    return MessageService.sendTextMessage(user, {
      ...data,
      conversation_id: id,
    });
  },

  // Đánh dấu đã đọc tin nhắn
  read: async (user, id, throughId) => {
    const conversation = await ConversationService.getAccessible(user, id);
    const readerId = user.accountId || user.account_id || user.id;
    return MessageModel.markRead(conversation.conversation_id, readerId);
  },

  // Nghiệp vụ reaction tin nhắn
  reactToMessage: async (user, messageId, reaction) => {
    return ReactionService.reactToMessage(user, messageId, reaction);
  },

  removeReaction: async (user, messageId) => {
    return ReactionService.removeReaction(user, messageId);
  },

  getMessageReaction: async (user, messageId) => {
    return ReactionService.getMessageReactions(user, messageId);
  },

  getMessageReactions: async (user, messageId) => {
    return ReactionService.getMessageReactions(user, messageId);
  },
};
