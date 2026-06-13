import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { config } from './configs/index.js';
import authRoutes from './routes/auth.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

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
