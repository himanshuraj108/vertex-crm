import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { testConnection } from './db/supabase';
import logger from './utils/logger';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function bootstrap(): Promise<void> {
  // ─── Validate Supabase connection (HTTPS, no pg port needed) ──────────────
  await testConnection();

  const app = createApp();
  const server = http.createServer(app);

  server.listen(PORT, () => {
    logger.info(`🚀 Vertex CRM Backend running on port ${PORT}`);
    logger.info(`   Environment : ${process.env.NODE_ENV ?? 'development'}`);
    logger.info(`   Health check: http://localhost:${PORT}/health`);
    logger.info(`   API base    : http://localhost:${PORT}/api/v1`);
  });

  // ─── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.info(`\n${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
