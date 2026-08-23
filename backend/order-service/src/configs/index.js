// backend\order-service\src\configs\index.js
import dotenv from "dotenv";
dotenv.config();

if (!process.env.JWT_ACCESS_SECRET) {
  console.error("Missing JWT_ACCESS_SECRET environment variable.");
  process.exit(1);
}

if (!process.env.JWT_REFRESH_SECRET) {
  console.error("Missing JWT_REFRESH_SECRET environment variable.");
  process.exit(1);
}

if (!process.env.SUPABASE_URL) {
  console.error("Missing SUPABASE_URL environment variable.");
  process.exit(1);
}

if (!process.env.SUPABASE_KEY) {
  console.error("Missing SUPABASE_KEY environment variable.");
  process.exit(1);
}

export const config = {
  port: process.env.PORT || 8003,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  rabbitMqUrl: process.env.RABBITMQ_URL,
  sepayBankCode: process.env.SEPAY_BANK_CODE || "Sacombank",
  sepayBankName:
    process.env.SEPAY_BANK_NAME ||
    "Ngân hàng TMCP Sài Gòn Thương Tín (Sacombank)",
  sepayAccountNumber: process.env.SEPAY_ACCOUNT_NUMBER || "060281585048",
  sepayAccountName: process.env.SEPAY_ACCOUNT_NAME || "NGUYEN THI QUYNH NHU",
  sepayWebhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY || "",
};
