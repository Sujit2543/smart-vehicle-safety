import './config/env'; // Load env vars first
import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';
import { startJobs, stopJobs } from './jobs';

async function bootstrap(): Promise<void> {
  // Connect to database
  await connectDatabase();

  // Start background jobs
  startJobs();

  // Start HTTP server — bind to 0.0.0.0 so LAN devices (phones) can connect
  const HOST = process.env.HOST ?? '0.0.0.0';
  const server = app.listen(env.PORT, HOST, () => {
    logger.info(`${env.APP_NAME} API running`, {
      port: env.PORT,
      host: HOST,
      env: env.NODE_ENV,
      prefix: env.API_PREFIX,
      lanUrl: `http://192.168.0.130:${env.PORT}`,
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      stopJobs();
      await disconnectDatabase();
      logger.info('Server closed');
      process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { err });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});
