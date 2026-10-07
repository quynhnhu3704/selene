import crypto from "node:crypto";
import { supabase } from "../configs/supabase.js";
import { CustomerModel } from "./customer.model.js";

export const ConversationModel = {
  // Lấy danh sách toàn bộ cuộc trò chuyện với bộ lọc status và tìm kiếm
  findAll: async ({ status, search, order }) => {
    let query = supabase
      .from("conversations")
      .select(
        `
        conversation_id,
        customer_id,
        customer_name,
        last_message_id,
        last_message_at,
        last_message,
        status,
        created_at,
        updated_at
      `
      );

    // Lọc theo trạng thái nếu có
    const normalized = status ? status.toLowerCase() : "";
    const isWaitingFilter = normalized === "pending" || normalized === "waiting";

    if (status && status !== "all") {
      if (isWaitingFilter) {
        query = query.in("status", ["pending", "waiting"]);
      } else if (normalized === "processing" || normalized === "open" || normalized === "active") {
        query = query.in("status", ["processing", "open", "active"]);
      } else {
        query = query.eq("status", normalized);
      }
    }

    // Riêng tab 'Chờ hỗ trợ' (waiting / pending): mặc định sắp xếp thời gian tăng dần (cũ nhất lên đầu - FIFO)
    const isAscending = order === "asc" || (!order && isWaitingFilter);

    if (isAscending) {
      query = query
        .order("last_message_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
    } else {
      query = query
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
    }

    const { data: conversations, error } = await query;
    if (error) throw error;

    if (!conversations || conversations.length === 0) {
      return [];
    }

    // Lấy thông tin nhân viên xử lý từ bảng conversation_participants (role: 'staff' hoặc 'admin')
    const convIds = conversations.map((c) => c.conversation_id);
    const staffMap = {};
    if (convIds.length > 0) {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, account_id, role")
        .in("conversation_id", convIds)
        .in("role", ["staff", "admin"]);

      (participants || []).forEach((p) => {
        if (!staffMap[p.conversation_id]) {
          staffMap[p.conversation_id] = p.account_id;
        }
      });
    }

    const formatted = conversations.map((conv) => {
      const nameInTable = conv.customer_name && conv.customer_name.trim();

      return {
        conversation_id: conv.conversation_id,
        customer_id: conv.customer_id,
        assigned_staff_id: staffMap[conv.conversation_id] || null,
        last_message_id: conv.last_message_id,
        last_message: conv.last_message,
        last_message_at: conv.last_message_at || conv.created_at,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        status: conv.status,
        customer_name: nameInTable || "Khách hàng",
      };
    });

    let resultItems = formatted;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      resultItems = formatted.filter(
        (item) =>
          item.customer_name?.toLowerCase().includes(q) ||
          item.last_message?.toLowerCase().includes(q) ||
          item.conversation_id?.toLowerCase().includes(q)
      );
    }

    // Sắp xếp:
    // - Nếu là Chờ hỗ trợ (isAscending): Sắp xếp theo thời gian tăng dần (cũ nhất / chờ lâu nhất lên đầu - FIFO)
    // - Các tab khác: Ưu tiên các cuộc trò chuyện trạng thái 'processing' lên đầu, sau đó sắp xếp theo thời gian giảm dần (mới nhất lên đầu)
    if (isAscending) {
      resultItems.sort((a, b) => {
        const timeA = new Date(a.last_message_at || a.created_at || 0).getTime();
        const timeB = new Date(b.last_message_at || b.created_at || 0).getTime();
        return timeA - timeB;
      });
    } else {
      resultItems.sort((a, b) => {
        const isAProcessing = a.status === "processing" || a.status === "open" || a.status === "active";
        const isBProcessing = b.status === "processing" || b.status === "open" || b.status === "active";

        if (isAProcessing && !isBProcessing) return -1;
        if (!isAProcessing && isBProcessing) return 1;

        const timeA = new Date(a.last_message_at || a.created_at || 0).getTime();
        const timeB = new Date(b.last_message_at || b.created_at || 0).getTime();
        return timeB - timeA;
      });
    }

    return resultItems;
  },

  // Đếm số lượng cuộc trò chuyện theo trạng thái
  countByStatus: async (statusList) => {
    const { count, error } = await supabase
      .from("conversations")
      .select("conversation_id", { count: "exact", head: true })
      .in("status", Array.isArray(statusList) ? statusList : [statusList]);

    if (error) throw error;
    return count || 0;
  },

  // Lấy chi tiết cuộc trò chuyện theo conversation_id (ID cuộc trò chuyện)
  findById: async (conversationId) => {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
        conversation_id,
        customer_id,
        customer_name,
        last_message_id,
        last_message_at,
        last_message,
        status,
        created_at,
        updated_at
      `
      )
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    if (!data) return null;

    // Lấy nhân viên xử lý từ conversation_participants
    const { data: staffParticipant } = await supabase
      .from("conversation_participants")
      .select("account_id")
      .eq("conversation_id", conversationId)
      .in("role", ["staff", "admin"])
      .maybeSingle();

    return {
      conversation_id: data.conversation_id,
      customer_id: data.customer_id,
      customer_name: (data.customer_name && data.customer_name.trim()) || "Khách hàng",
      assigned_staff_id: staffParticipant?.account_id || null,
      last_message_id: data.last_message_id,
      last_message_at: data.last_message_at,
      last_message: data.last_message,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  // Lấy chi tiết cuộc trò chuyện theo customer_id (ưu tiên cuộc hội thoại đang mở / chờ xử lý)
  findByCustomerId: async (customerId) => {
    if (!customerId) return null;

    // 1. Tìm cuộc hội thoại còn đang mở (waiting, pending, processing, active, open)
    const { data: openConv, error: openError } = await supabase
      .from("conversations")
      .select(
        `
        conversation_id,
        customer_id,
        customer_name,
        last_message_id,
        last_message_at,
        last_message,
        status,
        created_at,
        updated_at
      `
      )
      .eq("customer_id", customerId)
      .in("status", ["waiting", "pending", "processing", "active", "open"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let conv = openConv;
    if (!conv) {
      // 2. Nếu không có hội thoại mở, lấy hội thoại gần nhất (kể cả đã đóng)
      const { data: latestConv, error: latestError } = await supabase
        .from("conversations")
        .select(
          `
          conversation_id,
          customer_id,
          customer_name,
          last_message_id,
          last_message_at,
          last_message,
          status,
          created_at,
          updated_at
        `
        )
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError && latestError.code !== "PGRST116") throw latestError;
      conv = latestConv;
    }

    if (!conv) return null;

    // Lấy nhân viên xử lý từ conversation_participants
    const { data: staffParticipant } = await supabase
      .from("conversation_participants")
      .select("account_id")
      .eq("conversation_id", conv.conversation_id)
      .in("role", ["staff", "admin"])
      .maybeSingle();

    return {
      conversation_id: conv.conversation_id,
      customer_id: conv.customer_id,
      customer_name: (conv.customer_name && conv.customer_name.trim()) || "Khách hàng",
      assigned_staff_id: staffParticipant?.account_id || null,
      last_message_id: conv.last_message_id,
      last_message_at: conv.last_message_at,
      last_message: conv.last_message,
      status: conv.status,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
    };
  },

  // Lấy toàn bộ danh sách conversation_id của khách hàng
  findAllIdsByCustomerId: async (customerId) => {
    if (!customerId) return [];
    const { data, error } = await supabase
      .from("conversations")
      .select("conversation_id")
      .eq("customer_id", customerId);

    if (error) throw error;
    return (data || []).map((c) => c.conversation_id);
  },

  // Lấy thông tin chi tiết khách hàng từ bảng user_profiles
  findCustomerInfo: (customerId, fallbackName = "Khách hàng") =>
    CustomerModel.findByAccountId(customerId, fallbackName),

  // Tìm cuộc hội thoại còn đang mở của khách hàng
  findOpenByCustomerId: async (customerId) => {
    if (!customerId) return null;
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
        conversation_id,
        customer_id,
        customer_name,
        last_message_id,
        last_message_at,
        last_message,
        status,
        created_at,
        updated_at
      `
      )
      .eq("customer_id", customerId)
      .in("status", ["pending", "waiting", "processing", "active", "open"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  },

  // Tạo mới cuộc hội thoại trong bảng conversations
  create: async ({
    conversation_id,
    customer_id,
    customer_name,
    status = "pending",
    last_message = null,
    last_message_at = null,
    last_message_id = null,
  }) => {
    const now = new Date().toISOString();
    const convId = conversation_id || crypto.randomUUID();
    const payload = {
      conversation_id: convId,
      customer_id,
      customer_name: (customer_name && customer_name.trim()) || "Khách hàng",
      status: status || "pending",
      last_message: last_message || null,
      last_message_at: last_message_at || now,
      last_message_id: last_message_id || null,
      created_at: now,
      updated_at: now,
    };

    let { data, error } = await supabase
      .from("conversations")
      .insert([payload])
      .select()
      .single();

    // Dự phòng trường hợp DB cũ có CHECK (status IN ('waiting', 'active', 'closed'))
    if (error && error.message?.includes("conversations_status_check")) {
      payload.status = "waiting";
      const retry = await supabase
        .from("conversations")
        .insert([payload])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return data;
  },

  // Cập nhật thông tin cuộc trò chuyện
  update: async (conversationId, updates) => {
    let payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from("conversations")
      .update(payload)
      .eq("conversation_id", conversationId)
      .select()
      .single();

    // 1. Dự phòng trường hợp DB không có cột assigned_staff_id
    if (
      error &&
      payload.assigned_staff_id &&
      (error.message?.includes("assigned_staff_id") || error.message?.includes("column"))
    ) {
      delete payload.assigned_staff_id;
      const retry = await supabase
        .from("conversations")
        .update(payload)
        .eq("conversation_id", conversationId)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    // 2. Dự phòng trường hợp ràng buộc CHECK (status) giữa 'active' và 'processing'
    if (error && error.message?.includes("conversations_status_check")) {
      if (payload.status === "active") payload.status = "processing";
      else if (payload.status === "processing") payload.status = "active";
      const retry = await supabase
        .from("conversations")
        .update(payload)
        .eq("conversation_id", conversationId)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return data;
  },

  // Tìm người tham gia theo conversation_id và account_id
  findParticipant: async (conversationId, accountId) => {
    const { data, error } = await supabase
      .from("conversation_participants")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("account_id", accountId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  },

  // Thêm người tham gia vào conversation_participants
  addParticipant: async ({
    conversation_participant_id,
    conversation_id,
    account_id,
    role = "customer",
    last_read_message_id = null,
    last_read_at = null,
  }) => {
    const now = new Date().toISOString();
    const payload = {
      conversation_participant_id: conversation_participant_id || crypto.randomUUID(),
      conversation_id,
      account_id,
      role: role || "customer",
      last_read_message_id: last_read_message_id || null,
      last_read_at: last_read_at || now,
      joined_at: now,
    };

    const { data, error } = await supabase
      .from("conversation_participants")
      .insert([payload])
      .select()
      .maybeSingle();

    if (error && error.code !== "23505") throw error; // Bỏ qua nếu đã tồn tại unique index
    return data;
  },

  // Cập nhật hoặc thêm mới người tham gia (upsert)
  upsertParticipant: async ({
    conversation_id,
    account_id,
    role = "customer",
    last_read_message_id = null,
    last_read_at = null,
  }) => {
    const now = new Date().toISOString();

    const existing = await ConversationModel.findParticipant(conversation_id, account_id);
    if (existing) {
      const updates = {};
      if (last_read_message_id) updates.last_read_message_id = last_read_message_id;
      if (last_read_at) updates.last_read_at = last_read_at;

      const { data, error } = await supabase
        .from("conversation_participants")
        .update(updates)
        .eq("conversation_participant_id", existing.conversation_participant_id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    } else {
      return ConversationModel.addParticipant({
        conversation_id,
        account_id,
        role,
        last_read_message_id,
        last_read_at: last_read_at || now,
      });
    }
  },
};
