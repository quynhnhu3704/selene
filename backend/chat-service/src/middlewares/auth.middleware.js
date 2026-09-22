import jwt from "jsonwebtoken";
import { config } from "../configs/index.js";
import { getChatUser, requirePermission } from "../services/conversation.service.js";

export const authenticate = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtAccessSecret, { algorithms: ["HS256"] });
    if (!decoded.accountId) throw new Error("Missing accountId");
  } catch {
    throw { status: 401, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn!" };
  }
  return { ...await getChatUser(decoded.accountId), exp: decoded.exp };
};

export const verifyToken = async (req, res, next) => {
  try {
    req.user = await authenticate(req.headers.authorization?.split(" ")[1]);
    next();
  } catch (error) { next(error); }
};

export const verifyPermission = (permission) => (req, res, next) => {
  try { requirePermission(req.user, permission); next(); }
  catch (error) { next(error); }
};
