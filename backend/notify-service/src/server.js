import express from 'express';
import dotenv from 'dotenv';
import { connectRabbitMQ } from './configs/rabbitmq.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8004;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'notify-service' });
});

// Start server and connect RabbitMQ
app.listen(PORT, async () => {
  console.log(`Notify Service is running on port ${PORT}`);
  try {
    await connectRabbitMQ();
  } catch (error) {
    console.error('Failed to initialize RabbitMQ in Notify Service', error);
  }
});
