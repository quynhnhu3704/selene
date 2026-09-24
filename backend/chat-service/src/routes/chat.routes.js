import { Router } from "express";
import { verifyToken, verifyPermission } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyToken);

export default router;
