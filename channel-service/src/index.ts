import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { retryQueue } from './retryQueue';
import sendRouter from './routes/send';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env['PORT'] ?? '3002', 10);
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

// ---------------------------------------------------------------------------
// Express App
// ---------------------------------------------------------------------------
const app = express();

// Security headers
app.use(helmet());

// CORS — allow all origins in development; tighten in production as needed
app.use(
  cors({
    origin: NODE_ENV === 'production' ? process.env['ALLOWED_ORIGINS']?.split(',') : '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parse JSON bodies (up to 1mb)
app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /health
 * Returns service health status including the number of pending retry jobs.
 */
app.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    service: 'vertex-channel-service',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    retryQueue: {
      pending: retryQueue.pendingCount,
    },
  });
});

// Mount the send router at root level so the route is POST /send
app.use('/', sendRouter);

// ---------------------------------------------------------------------------
// 404 Handler — catch-all for unknown routes
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('[App] Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log(`[App] vertex-channel-service listening on port ${PORT} (${NODE_ENV})`);
  console.log(`[App] Health check → http://localhost:${PORT}/health`);
  console.log(`[App] Send endpoint → POST http://localhost:${PORT}/send`);

  // Start the retry queue background worker
  retryQueue.start();
});

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

function shutdown(signal: string): void {
  console.log(`[App] Received ${signal} — shutting down gracefully…`);

  // Stop accepting new connections
  server.close((err?: Error) => {
    if (err) {
      console.error('[App] Error closing HTTP server:', err.message);
      process.exit(1);
    }

    // Stop retry queue polling
    retryQueue.stop();

    console.log('[App] Shutdown complete');
    process.exit(0);
  });

  // Force-exit after 10 s if graceful shutdown stalls
  setTimeout(() => {
    console.error('[App] Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
