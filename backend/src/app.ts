import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { ApiError } from './utils/ApiError';

import customerRoutes from './routes/v1/customers';
import segmentRoutes from './routes/v1/segments';
import campaignRoutes from './routes/v1/campaigns';
import receiptRoutes from './routes/v1/receipts';
import analyticsRoutes from './routes/v1/analytics';
import aiRoutes from './routes/v1/ai';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {

        if (!origin || origin.startsWith('http://localhost') || origin === process.env.FRONTEND_URL) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(rateLimiter);

  app.use(requestLogger);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'vertex-crm-backend',
      version: process.env.npm_package_version ?? '1.0.0',
      commit: '532bdc4-v2',
      groqKeyPresent: !!process.env.GROQ_API_KEY,
      groqKeyLength: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 0,
    });
  });

  app.use('/api/v1/customers', customerRoutes);
  app.use('/api/v1/segments', segmentRoutes);
  app.use('/api/v1/campaigns', campaignRoutes);
  app.use('/api/v1/receipts', receiptRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/ai', aiRoutes);

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(ApiError.notFound(`Route not found`));
  });

  app.use(errorHandler);

  return app;
}
