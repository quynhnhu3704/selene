import { config } from "./index.js";
import { UserProfileModel } from "../models/userProfile.model.js";

import { fileURLToPath } from "url";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let amqp = null;
const candidatePaths = [
  "amqplib",
  path.resolve(__dirname, "../../../order-service/node_modules/amqplib"),
  path.resolve(__dirname, "../../../product-service/node_modules/amqplib"),
  path.resolve(__dirname, "../../../notify-service/node_modules/amqplib"),
];

for (const p of candidatePaths) {
  try {
    const mod = require(p);
    if (mod && (mod.connect || mod.default?.connect)) {
      amqp = mod.connect ? mod : mod.default;
      break;
    }
  } catch {
    // continue
  }
}

let channel = null;

export const connectRabbitMQ = async () => {
  if (!amqp) {
    console.warn("[RabbitMQ Auth] amqplib library not found in node_modules");
    return;
  }
  try {
    const connection = await amqp.connect(config.rabbitMqUrl);
    channel = await connection.createChannel();
    console.log("[x] Connected to RabbitMQ (Auth Service RPC Server)");

    await listenForCustomerProfileRequests();
  } catch (error) {
    console.error("Failed to connect to RabbitMQ (Auth Service):", error.message);
  }
};

export const listenForCustomerProfileRequests = async () => {
  if (!channel) throw new Error("RabbitMQ channel not initialized in Auth Service");

  const queueName = "rpc_customer_profile_queue";
  await channel.assertQueue(queueName, { durable: false });
  channel.prefetch(1);

  console.log(`[x] Awaiting RPC requests for customer profiles on ${queueName}`);

  channel.consume(queueName, async (msg) => {
    if (!msg) return;

    let responseData = null;
    try {
      const payload = JSON.parse(msg.content.toString());
      const accountId = payload?.account_id;
      console.log(`[.] Auth Service received RPC request for customer profile:`, accountId);

      if (accountId) {
        const [profile, account] = await Promise.all([
          UserProfileModel.getProfileByAccountId(accountId),
          UserProfileModel.getAccountByAccountId(accountId),
        ]);

        responseData = {
          account_id: accountId,
          profile_id: profile?.profile_id || null,
          full_name: profile?.full_name || null,
          phone_number: profile?.phone_number || null,
          identity_card: profile?.identity_card || null,
          avatar_url: profile?.avatar_url || null,
          gender: profile?.gender || null,
          dob: profile?.dob || null,
          address: profile?.address || null,
          status: profile?.status || "active",
          email: account?.email || null,
          created_at: profile?.created_at || null,
          updated_at: profile?.updated_at || null,
        };
      }
    } catch (err) {
      console.error("Error processing customer profile RPC request:", err);
    }

    if (msg.properties.replyTo) {
      channel.sendToQueue(
        msg.properties.replyTo,
        Buffer.from(JSON.stringify(responseData)),
        { correlationId: msg.properties.correlationId }
      );
    }

    channel.ack(msg);
  });
};
