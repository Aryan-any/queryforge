import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { startPoolCleanup, shutdownPools } from './db/pool';
import { runMigrations } from './db/migrations';
import { getDemoPool } from './db/pool';
import logger from './utils/logger';

// Controllers
import authController from './controllers/authController';
import connectionController from './controllers/connectionController';
import schemaController from './controllers/schemaController';
import queryController from './controllers/queryController';
import dashboardController from './controllers/dashboardController';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
  },
}));

// Auth middleware (exempts /api/auth routes)
app.use(authMiddleware);

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/auth', authController);
app.use('/api/connections', connectionController);
app.use('/api/schema', schemaController);
app.use('/api/query', queryController);
app.use('/api/dashboards', dashboardController);

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler ───────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Server Start ────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  try {
    // Run migrations for dashboard tables on the demo DB
    if (config.demoDatabaseUrl) {
      try {
        const demoPool = getDemoPool();
        await runMigrations(demoPool);
        logger.info('Demo database ready with dashboard tables');
      } catch (error) {
        logger.warn('Could not connect to demo database. Demo mode will be unavailable.', {
          error: (error as Error).message,
        });
      }
    }

    // Start pool cleanup scheduler
    startPoolCleanup();

    app.listen(config.port, () => {
      logger.info(`🚀 QueryForge backend running on port ${config.port}`);
      logger.info(`   Environment: ${config.nodeEnv}`);
      logger.info(`   Frontend URL: ${config.frontendUrl}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await shutdownPools();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await shutdownPools();
  process.exit(0);
});

start();
