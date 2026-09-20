import dotenv from "dotenv";
dotenv.config();

for (const name of ["JWT_ACCESS_SECRET", "SUPABASE_URL", "SUPABASE_KEY"]) {
  if (!process.env[name]) throw new Error(`Missing ${name} environment variable.`);
}

export const config = {
  port: process.env.PORT || 8004,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  orderServiceUrl: process.env.ORDER_SERVICE_URL || "http://localhost:8003",
};
