import crypto from "node:crypto";
import { MessageModel } from "../models/message.model.js";
import { ConversationModel } from "../models/conversation.model.js";
import { CustomerModel } from "../models/customer.model.js";
import { ConversationService, requirePermission } from "./conversation.service.js";
import { uploadChatFile, getMessageTypeFromMime } from "./storage.service.js";

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
      file = null,
      file_url = null,
      file_name = null,
      file_size = null,
      file_type = null,
      message_type = "text",
    } = {}
  ) => {
    // Nếu có file hoặc file_url truyền vào, chuyển tiếp sang sendMediaMessage
    if (file || file_url || (message_type && message_type !== "text")) {
      return MessageService.sendMediaMessage(user, {
        conversation_id,
        customer_id,
        content,
        reply_to_message_id,
        sender_type,
        file,
        file_url,
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
      if (conversation.status === "closed" && isCustomer) {
        try {
          await ConversationModel.update(conversation.conversation_id, {
            status: "pending",
          });
          conversation.status = "pending";
        } catch (err) {
          console.warn("[MessageService] Warning reopening closed conversation:", err.message);
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
      status: createdMessage.status || "sent",
      is_read: true,
      created_at: createdMessage.created_at,
      updated_at: createdMessage.updated_at || createdMessage.created_at,
    };

    return {
      message: formattedMessage,
      conversation,
      is_new_conversation: isNewConversation,
    };
  },

  /**
   * Chức năng gửi tin nhắn loại hình ảnh, video, file / tệp đính kèm:
   * - Hỗ trợ cả nhận file tải lên từ Multer hoặc file_url đã có sẵn
   * - Tự động upload lên Supabase Storage và xác định loại media
   * - Tự động tạo cuộc hội thoại mới nếu khách hàng chưa có hội thoại mở
   *
   * @param {Object} user - Thông tin người dùng đăng nhập
   * @param {Object} payload - { conversation_id, customer_id, file, file_url, file_name, file_size, file_type, message_type, content, reply_to_message_id, sender_type }
   */
  sendMediaMessage: async (
    user,
    {
      conversation_id,
      customer_id,
      file = null,
      file_url = null,
      file_name = null,
      file_size = null,
      file_type = null,
      message_type = null,
      content = "",
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

    // 2. Xử lý tệp đính kèm
    let finalFileUrl = file_url;
    let finalFileName = file_name;
    let finalFileSize = file_size;
    let finalFileType = file_type;
    let finalMessageType = message_type;

    if (file) {
      const uploadResult = await uploadChatFile(file);
      finalFileUrl = uploadResult.file_url;
      finalFileName = uploadResult.file_name;
      finalFileSize = uploadResult.file_size;
      finalFileType = uploadResult.file_type;
      if (!finalMessageType || finalMessageType === "text") {
        finalMessageType = uploadResult.message_type;
      }
    }

    if (!finalFileUrl) {
      throw { status: 400, message: "Vui lòng đính kèm tệp tin hoặc cung cấp đường dẫn tệp (file_url)!" };
    }

    // Tự động suy ra message_type nếu chưa có
    if (!finalMessageType || !["image", "video", "file", "audio"].includes(finalMessageType)) {
      finalMessageType = getMessageTypeFromMime(finalFileType, finalFileName);
    }

    // 3. Chuẩn bị nội dung hiển thị & văn bản tóm tắt cho cuộc hội thoại
    const textCaption = typeof content === "string" ? content.trim() : "";
    let previewText = "";
    if (finalMessageType === "image") {
      previewText = textCaption ? `[Hình ảnh] ${textCaption}` : "[Hình ảnh]";
    } else if (finalMessageType === "video") {
      previewText = textCaption ? `[Video] ${textCaption}` : "[Video]";
    } else if (finalMessageType === "audio") {
      previewText = textCaption ? `[Ghi âm] ${textCaption}` : "[Âm thanh]";
    } else {
      previewText = textCaption ? `[Tệp đính kèm] ${textCaption}` : `[Tệp đính kèm] ${finalFileName || "tệp tin"}`;
    }

    const messageContent = textCaption || finalFileName || previewText;

    // 4. Tìm cuộc hội thoại tương ứng
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
      if (conversation.status === "closed" && isCustomer) {
        try {
          await ConversationModel.update(conversation.conversation_id, { status: "pending" });
          conversation.status = "pending";
        } catch (err) {
          console.warn("[MessageService] Warning reopening closed conversation:", err.message);
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

    // 5. Lưu tin nhắn vào bảng messages
    const messageId = crypto.randomUUID();
    const createdMessage = await MessageModel.create({
      messageId,
      conversationId: conversation.conversation_id,
      senderId: sender_type === "ai" || sender_type === "system" ? null : senderId,
      senderType: sender_type || "user",
      messageType: finalMessageType,
      content: messageContent,
      fileUrl: finalFileUrl,
      fileName: finalFileName,
      fileSize: finalFileSize,
      fileType: finalFileType,
      replyToMessageId: reply_to_message_id || null,
      status: "sent",
    });

    const messageCreatedAt = createdMessage.created_at || now;

    // 6. Cập nhật last_message của hội thoại
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

    // 7. Cập nhật trạng thái đã xem cho người gửi
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

    // 8. Định dạng dữ liệu trả về cho client
    const formattedMessage = {
      message_id: createdMessage.message_id,
      conversation_id: createdMessage.conversation_id,
      sender_id: createdMessage.sender_id,
      sender_type: createdMessage.sender_type || "user",
      sender_role: isCustomer ? "customer" : userRole === "admin" ? "admin" : "staff",
      message_type: finalMessageType,
      content: createdMessage.content,
      attachments: createdMessage.attachments || [],
      reply_to_message_id: createdMessage.reply_to_message_id || null,
      status: createdMessage.status || "sent",
      is_read: true,
      created_at: createdMessage.created_at,
      updated_at: createdMessage.updated_at || createdMessage.created_at,
    };

    return {
      message: formattedMessage,
      conversation,
      is_new_conversation: isNewConversation,
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
};
