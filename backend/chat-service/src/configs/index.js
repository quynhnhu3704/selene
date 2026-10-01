import dotenv from "dotenv";
dotenv.config();

for (const name of ["JWT_ACCESS_SECRET", "SUPABASE_URL", "SUPABASE_KEY"]) {
  if (!process.env[name]) throw new Error(`Missing ${name} environment variable.`);
}

export const config = {
  port: process.env.PORT || 8005,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  orderServiceUrl: process.env.ORDER_SERVICE_URL || "http://localhost:8003",
  rabbitMqUrl:
    process.env.RABBITMQ_URL ||
    "amqps://xisaobuz:nel4L1FL6Ei7IKK18lWnaStkH7efpILq@capybara.lmq.cloudamqp.com/xisaobuz",
};
