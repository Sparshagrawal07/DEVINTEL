import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';

import { getEnv } from './config/env';
import { logger } from './config/logger';
import { getPool, closePool } from './config/database';
import { closeRedis } from './config/redis';
import { errorHandler, notFoundHandler, globalRateLimit, requestLogger } from './middleware';
import { startWorkers } from './jobs/queue';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import githubRoutes from './modules/github/github.routes';
import resumeRoutes from './modules/resume/resume.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';

async function bootstrap(): Promise<void> {
  // Load env early
  const env = getEnv();

  // Ensure upload directory exists
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Ensure logs directory exists
  const logsDir = path.resolve('./logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const app = express();

  // Render and other cloud platforms run behind a reverse proxy.
  // Needed so rate-limit and req.ip use X-Forwarded-For correctly.
  app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);

  // ============================================================
  // GLOBAL MIDDLEWARE
  // ============================================================
  app.use(helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  }));
  app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(globalRateLimit);

  // ============================================================
  // HEALTH CHECK
  // ============================================================
  app.get('/', (_req, res) => {
    res.status(200).send('ok');
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'devintel-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================
  // API ROUTES
  // ============================================================
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/github', githubRoutes);
  app.use('/api/resume', resumeRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // ============================================================
  // ERROR HANDLING
  // ============================================================
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ============================================================
  // DATABASE CONNECTION CHECK
  // ============================================================
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    logger.info('Database connection established');
  } catch (error) {
    logger.warn('Database not available, continuing without DB:', error);
  }

  // ============================================================
  // START BACKGROUND WORKERS
  // ============================================================
  try {
    startWorkers();
    logger.info('Background workers started');
  } catch (error) {
    logger.warn('Background workers could not start (Redis may not be available):', error);
  }

  // ============================================================
  // START SERVER
  // ============================================================
  const server = app.listen(env.PORT, () => {
    logger.info(`DevIntel API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  // ============================================================
  // GRACEFUL SHUTDOWN
  // ============================================================
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed');

      await closePool();
      logger.info('Database pool closed');

      await closeRedis();
      logger.info('Redis connection closed');

      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
