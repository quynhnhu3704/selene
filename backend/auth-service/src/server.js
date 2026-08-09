// backend\auth-service\src\server.js
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { config } from './configs/index.js';
import authRoutes from './routes/auth.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import cookieParser from 'cookie-parser';

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());

// Routes
app.use('/', authRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ service: 'auth', status: 'UP' });
});

// Error Handling
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Auth Service running on port ${config.port}`);
});
