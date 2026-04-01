import { Pool, PoolConfig } from 'pg';
import { ConnectionConfig } from '../utils/types';
import { config } from '../config';
import logger from '../utils/logger';

// ─── Pool Store ──────────────────────────────────────────────────────────────
// Manages per-session connection pools with automatic cleanup

const poolStore = new Map<string, { pool: Pool; lastAccessed: number }>();
const POOL_TTL_MS = 30 * 60 * 1000; // 30 minutes

let demoPool: Pool | null = null;

/**
 * Get or create the demo database pool.
 */
export function getDemoPool(): Pool {
  if (!demoPool) {
    if (!config.demoDatabaseUrl) {
      throw new Error('DEMO_DATABASE_URL is not configured');
    }
    demoPool = new Pool({
      connectionString: config.demoDatabaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: config.demoDatabaseUrl.includes('sslmode=require') || 
           config.demoDatabaseUrl.includes('neon.tech') || 
           config.demoDatabaseUrl.includes('supabase') 
        ? { rejectUnauthorized: false } 
        : undefined,
    });
    logger.info('Demo database pool created');
  }
  return demoPool;
}

/**
 * Create a connection pool for a user-provided database.
 */
export function createUserPool(connectionId: string, connConfig: ConnectionConfig): Pool {
  // Clean up existing pool for this session
  if (poolStore.has(connectionId)) {
    const existing = poolStore.get(connectionId)!;
    existing.pool.end().catch(() => {});
    poolStore.delete(connectionId);
  }

  const poolConfig: PoolConfig = {
    host: connConfig.host,
    port: connConfig.port,
    database: connConfig.database,
    user: connConfig.user,
    password: connConfig.password,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: connConfig.ssl ? { rejectUnauthorized: false } : undefined,
  };

  const pool = new Pool(poolConfig);
  poolStore.set(connectionId, { pool, lastAccessed: Date.now() });
  logger.info('User database pool created', { connectionId });

  return pool;
}

/**
 * Get a pool by connection ID.
 */
export function getUserPool(connectionId: string): Pool | null {
  const entry = poolStore.get(connectionId);
  if (!entry) return null;
  // Update last accessed time
  entry.lastAccessed = Date.now();
  return entry.pool;
}

/**
 * Remove and close a user pool.
 */
export async function removeUserPool(connectionId: string): Promise<void> {
  const entry = poolStore.get(connectionId);
  if (entry) {
    await entry.pool.end();
    poolStore.delete(connectionId);
    logger.info('User database pool removed', { connectionId });
  }
}

/**
 * Test a database connection.
 */
export async function testConnection(connConfig: ConnectionConfig): Promise<boolean> {
  const pool = new Pool({
    host: connConfig.host,
    port: connConfig.port,
    database: connConfig.database,
    user: connConfig.user,
    password: connConfig.password,
    max: 1,
    connectionTimeoutMillis: 10000,
    ssl: connConfig.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    logger.error('Connection test failed', { error: (error as Error).message });
    return false;
  } finally {
    await pool.end();
  }
}

/**
 * Clean up expired pools periodically.
 */
export function startPoolCleanup(): void {
  setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of poolStore) {
      if (now - entry.lastAccessed > POOL_TTL_MS) {
        entry.pool.end().catch(() => {});
        poolStore.delete(id);
        logger.info('Expired pool cleaned up', { connectionId: id });
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}

/**
 * Graceful shutdown of all pools.
 */
export async function shutdownPools(): Promise<void> {
  if (demoPool) {
    await demoPool.end();
    demoPool = null;
  }
  for (const [id, entry] of poolStore) {
    await entry.pool.end();
    poolStore.delete(id);
  }
  logger.info('All database pools shut down');
}
