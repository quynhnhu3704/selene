import * as chatbotService from "../services/chatbot.service.js";

// Kiểm tra câu hỏi và lịch sử trước khi chuyển vào bộ điều phối chatbot.
export const handleSendChatbotMessage = async (req, res) => {
  const { message, history = [] } = req.body || {};

  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 2000 ||
    !Array.isArray(history) ||
    history.length > 10 ||
    history.some((item) =>
      !item ||
      !["user", "bot"].includes(item.role) ||
      typeof item.text !== "string" ||
      !item.text.trim() ||
      item.text.length > 4000,
    )
  ) {
    return res.status(400).json({
      status: 400,
      message: "Câu hỏi hoặc lịch sử trò chuyện không hợp lệ!",
    });
  }

  try {
    const result = await chatbotService.getChatbotReply({
      message: message.trim(),
      history: history.map(({ role, text }) => ({ role, text: text.trim() })),
    });

    return res.status(200).json({
      status: 200,
      message: "Gửi tin nhắn thành công!",
      data: result,
    });
  } catch (error) {
    console.error("Lỗi tại handleSendChatbotMessage:", error.message);
    return res.status(503).json({
      status: 503,
      message: "Trợ lý ảo Selene đang tạm thời không hoạt động. Vui lòng thử lại sau.",
    });
  }
};
