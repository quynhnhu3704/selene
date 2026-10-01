import { fileURLToPath } from "url";
import path from "path";
import { createRequire } from "module";
import crypto from "crypto";
import EventEmitter from "events";
import { config } from "./index.js";

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
    // continue searching candidates
  }
}

let connection = null;
let channel = null;

const replyQueue = "amq.rabbitmq.reply-to";
const responseEmitter = new EventEmitter();
responseEmitter.setMaxListeners(0);

export const connectRabbitMQ = async () => {
  if (!amqp) {
    console.warn("[RabbitMQ Chat] amqplib library not found in node_modules, RPC fallback mode active");
    return;
  }

  try {
    connection = await amqp.connect(config.rabbitMqUrl);
    channel = await connection.createChannel();

    channel.consume(
      replyQueue,
      (msg) => {
        if (!msg) return;
        const correlationId = msg.properties.correlationId;
        try {
          const content = JSON.parse(msg.content.toString());
          responseEmitter.emit(correlationId, content);
        } catch (err) {
          console.error("[RabbitMQ Chat] Error parsing response message:", err.message);
          responseEmitter.emit(correlationId, null);
        }
      },
      { noAck: true }
    );

    console.log("[x] Connected to RabbitMQ (Chat Service RPC Client)");

    connection.on("error", (err) => {
      console.error("[RabbitMQ Chat] Connection error:", err.message);
    });

    connection.on("close", () => {
      console.warn("[RabbitMQ Chat] Connection closed. Reconnecting in 5s...");
      channel = null;
      connection = null;
      setTimeout(connectRabbitMQ, 5000);
    });
  } catch (error) {
    console.error("[RabbitMQ Chat] Failed to connect:", error.message);
    setTimeout(connectRabbitMQ, 5000);
  }
};

/**
 * Gửi yêu cầu RPC qua RabbitMQ đến auth-service để lấy thông tin người dùng theo account_id
 * @param {string} accountId 
 * @param {number} timeoutMs 
 * @returns {Promise<object|null>}
 */
export const requestCustomerProfile = async (accountId, timeoutMs = 6000) => {
  if (!channel) {
    console.warn("[RabbitMQ Chat] Channel not ready yet for requestCustomerProfile");
    return null;
  }

  if (!accountId) {
    return null;
  }

  const queueName = "rpc_customer_profile_queue";

  return new Promise((resolve) => {
    const correlationId = crypto.randomBytes(16).toString("hex");

    const timer = setTimeout(() => {
      responseEmitter.removeAllListeners(correlationId);
      console.warn(`[RabbitMQ Chat] RPC timeout waiting for customer profile (${accountId})`);
      resolve(null);
    }, timeoutMs);

    responseEmitter.once(correlationId, (response) => {
      clearTimeout(timer);
      resolve(response);
    });

    try {
      const payload = JSON.stringify({ account_id: accountId });
      channel.sendToQueue(queueName, Buffer.from(payload), {
        correlationId,
        replyTo: replyQueue,
      });
    } catch (err) {
      clearTimeout(timer);
      responseEmitter.removeAllListeners(correlationId);
      console.error("[RabbitMQ Chat] Error sending RPC request:", err.message);
      resolve(null);
    }
  });
};
