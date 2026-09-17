import http from "./http";

// Gửi câu hỏi và ngữ cảnh qua HTTP client chung của Selene.
export const sendMessageToBot = async (message, history = []) => {
  const res = await http.post(
    "/chatbot",
    { message, history },
    { withCredentials: false, timeout: 35000 },
  );

  return res.data;
};
