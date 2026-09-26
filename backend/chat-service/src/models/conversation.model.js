import { supabase } from "../configs/supabase.js";

export const ConversationModel = {
  // Lấy danh sách toàn bộ cuộc trò chuyện với bộ lọc status và tìm kiếm
  findAll: async ({ status, search }) => {
    let query = supabase.from("conversations").select(
      `
        conversation_id,
        customer_name,
        last_message_id,
        last_message_at,
        last_message,
        status,
        created_at
      `,
    );

    // Lọc theo trạng thái nếu có
    if (status && status !== "all") {
      const normalized = status.toLowerCase();
      if (normalized === "pending" || normalized === "waiting") {
        query = query.in("status", ["pending", "waiting"]);
      } else if (
        normalized === "processing" ||
        normalized === "open" ||
        normalized === "active"
      ) {
        query = query.in("status", ["processing", "open", "active"]);
      } else {
        query = query.eq("status", normalized);
      }
    }

    query = query
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    const { data: conversations, error } = await query;
    if (error) throw error;

    if (!conversations || conversations.length === 0) {
      return [];
    }

    const formatted = conversations.map((conv) => {
      const nameInTable = conv.customer_name && conv.customer_name.trim();

      return {
        conversation_id: conv.conversation_id,
        last_message_id: conv.last_message_id,
        last_message: conv.last_message,
        last_message_at: conv.last_message_at || conv.created_at,
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
          item.conversation_id?.toLowerCase().includes(q),
      );
    }

    // Sắp xếp: Ưu tiên các cuộc trò chuyện trạng thái 'processing' lên đầu, sau đó sắp xếp theo thời gian giảm dần
    resultItems.sort((a, b) => {
      const isAProcessing =
        a.status === "processing" ||
        a.status === "open" ||
        a.status === "active";
      const isBProcessing =
        b.status === "processing" ||
        b.status === "open" ||
        b.status === "active";

      if (isAProcessing && !isBProcessing) return -1;
      if (!isAProcessing && isBProcessing) return 1;

      const timeA = new Date(a.last_message_at || 0).getTime();
      const timeB = new Date(b.last_message_at || 0).getTime();
      return timeB - timeA;
    });

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

  // Lấy chi tiết cuộc trò chuyện theo ID
  findById: async (conversationId) => {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
        conversation_id,
        customer_name,
        last_message_id,
        last_message_at,
        last_message,
        status
      `,
      )
      .eq("conversation_id", conversationId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    if (!data) return null;

    return {
      conversation_id: data.conversation_id,
      customer_name:
        (data.customer_name && data.customer_name.trim()) || "Khách hàng",
      last_message_id: data.last_message_id,
      last_message_at: data.last_message_at,
      last_message: data.last_message,
      status: data.status,
    };
  },
};
