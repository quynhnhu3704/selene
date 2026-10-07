import http from "./http";

// Gửi câu hỏi và ngữ cảnh qua HTTP client chung của Selene.
export const sendMessageToBot = async (message, history = []) => {
  // Comment lại POST /api/chatbot theo yêu cầu
  /*
  const res = await http.post(
    "/chatbot",
    { message, history },
    { withCredentials: false, timeout: 35000 },
  );

  return res.data;
  */
  return { reply: "", products: [] };
};
