// backend\order-service\src\server.js
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { config } from './configs/index.js';
import orderRoutes from './routes/order.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { connectRabbitMQ } from './configs/rabbitmq.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/', orderRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ service: 'order', status: 'UP' });
});

// Error Handling
app.use(errorHandler);

app.listen(config.port, async () => {
  console.log(`Order Service running on port ${config.port}`);
  await connectRabbitMQ();
});
