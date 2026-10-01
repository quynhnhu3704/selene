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
        created_at
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

    const formatted = conversations.map((conv) => {
      const nameInTable = conv.customer_name && conv.customer_name.trim();

      return {
        conversation_id: conv.conversation_id,
        customer_id: conv.customer_id,
        last_message_id: conv.last_message_id,
        last_message: conv.last_message,
        last_message_at: conv.last_message_at || conv.created_at,
        created_at: conv.created_at,
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
      .single();

    if (error && error.code !== "PGRST116") throw error;
    if (!data) return null;

    return {
      conversation_id: data.conversation_id,
      customer_id: data.customer_id,
      customer_name: (data.customer_name && data.customer_name.trim()) || "Khách hàng",
      last_message_id: data.last_message_id,
      last_message_at: data.last_message_at,
      last_message: data.last_message,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  // Lấy thông tin chi tiết khách hàng từ bảng user_profiles
  findCustomerInfo: (customerId, fallbackName = "Khách hàng") =>
    CustomerModel.findByAccountId(customerId, fallbackName),
};

