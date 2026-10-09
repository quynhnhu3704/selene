import { requestCustomerProfile } from "../configs/rabbitmq.js";

export const CustomerModel = {
  /**
   * Lấy thông tin người dùng / khách hàng qua RabbitMQ RPC (Auth Service) theo account_id
   * Không truy vấn trực tiếp cơ sở dữ liệu của auth-service
   * 
   * Chỉ hiển thị các trường:
   * - account_id
   * - profile_id
   * - full_name
   * - email
   * - phone_number
   * - avatar_url
   * 
   * @param {string} accountId - ID tài khoản (customer_id của cuộc trò chuyện)
   * @param {string} fallbackName - Tên dự phòng nếu chưa tìm thấy profile
   */
  findByAccountId: async (accountId, fallbackName = "Khách hàng") => {
    if (!accountId) {
      return {
        account_id: null,
        profile_id: null,
        full_name: fallbackName,
        email: "Chưa có email",
        phone_number: "Chưa có số điện thoại",
        avatar_url: null,
      };
    }

    try {
      // Gửi RPC request qua RabbitMQ tới auth-service
      const profile = await requestCustomerProfile(accountId);

      if (profile) {
        return {
          account_id: accountId,
          profile_id: profile.profile_id || null,
          full_name: profile.full_name || fallbackName || "Khách hàng",
          email: profile.email || "Chưa có email",
          phone_number: profile.phone_number || "Chưa có số điện thoại",
          avatar_url: profile.avatar_url || null,
        };
      }
    } catch (err) {
      console.error("[CustomerModel] Error fetching customer profile via RabbitMQ:", err.message);
    }

    // Dự phòng an toàn nếu RabbitMQ không phản hồi kịp
    return {
      account_id: accountId,
      profile_id: null,
      full_name: fallbackName || "Khách hàng",
      email: "Chưa có email",
      phone_number: "Chưa có số điện thoại",
      avatar_url: null,
    };
  },
};
