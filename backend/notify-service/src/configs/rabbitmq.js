import amqp from 'amqplib';
import dotenv from 'dotenv';
import { supabase } from './supabase.js';
import { sendOrderSuccessEmail } from '../services/email.service.js';

dotenv.config();

let channel = null;
let connection = null;

export const connectRabbitMQ = async () => {
  try {
    const rabbitMqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqp.connect(rabbitMqUrl);
    channel = await connection.createChannel();

    console.log('[x] Connected to RabbitMQ in Notify Service');

    // Lắng nghe queue order_notification_queue
    const queueName = 'order_notification_queue';
    await channel.assertQueue(queueName, { durable: true });

    console.log(`[*] Waiting for messages in ${queueName}.`);

    channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          const payload = JSON.parse(msg.content.toString());
          console.log('[x] Received order notification event:', payload.orderCode);

          // Lấy email dựa vào accountId
          const { accountId } = payload;
          if (accountId) {
             const { data: account, error } = await supabase
               .from('accounts')
               .select('email')
               .eq('account_id', accountId)
               .single();

             if (error) {
               console.error(`Error fetching account for ID ${accountId}:`, error.message);
             } else if (account && account.email) {
               // Có email, tiến hành gửi email
               await sendOrderSuccessEmail(account.email, payload);
               console.log(`[x] Order success email sent to ${account.email}`);
             } else {
               console.error(`No email found for account ID ${accountId}`);
             }
          }

          // Xác nhận xử lý xong tin nhắn
          channel.ack(msg);
        } catch (error) {
          console.error('[!] Lỗi khi xử lý thông báo đặt hàng:', error);
          // NACK nếu muốn thử lại, hoặc ACK để bỏ qua tùy logic nghiệp vụ
          channel.ack(msg);
        }
      }
    });

  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error.message);
  }
};
