import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// API Root Router
app.use('/api', apiRoutes);

// 404 Handler for unmatched routes
app.use(notFoundHandler);

// Centralized Global Error Handler
app.use(errorHandler);

export default app;
