import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'default-secret-change-me',

  demoDatabaseUrl: process.env.DEMO_DATABASE_URL || '',

  auth: {
    username: process.env.AUTH_USERNAME || 'admin',
    password: process.env.AUTH_PASSWORD || 'queryforge2024',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  query: {
    defaultLimit: 100,
    maxLimit: 1000,
    timeoutMs: 30000,
  },

  llm: {
    maxRetries: 3,
    defaultModel: 'gpt-4o',
  },
} as const;
