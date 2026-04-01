import { Pool } from 'pg';
import { QueryResult, ColumnMeta } from '../utils/types';
import { config } from '../config';
import logger from '../utils/logger';
import crypto from 'crypto';

interface CacheEntry {
  data: QueryResult;
  timestamp: number;
}

const queryCache = new Map<string, CacheEntry>();
const QUERY_CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Query Execution Service
 * 
 * Executes validated SQL queries with timeout enforcement
 * and structured result formatting. Features a 60-second Data Cache.
 */
export class QueryService {
  /**
   * Execute a SQL query against a pool and return formatted results.
   */
  async execute(pool: Pool, sql: string): Promise<QueryResult> {
    // Generate unique database fingerprint safely
    const poolConfig = (pool as any).options;
    const dbId = poolConfig ? `${poolConfig.host}:${poolConfig.database}:${poolConfig.user}` : 'demo';
    
    // Hash SQL query with DB fingerprint for cache key
    const hash = crypto.createHash('md5').update(dbId + sql).digest('hex');

    // Check query cache
    const cached = queryCache.get(hash);
    if (cached && (Date.now() - cached.timestamp < QUERY_CACHE_TTL_MS)) {
      logger.info('Query cache hit (0ms latency)', { dbId, sql: sql.substring(0, 50) });
      return cached.data;
    }

    // Lazy cleanup (5% chance on miss)
    if (Math.random() < 0.05) this.cleanupCache();

    const startTime = Date.now();

    try {
      // Execute with timeout
      const result = await Promise.race([
        pool.query(sql),
        this.timeout(config.query.timeoutMs),
      ]);

      const executionTimeMs = Date.now() - startTime;

      // Extract column metadata
      const columns: ColumnMeta[] = result.fields.map(field => ({
        name: field.name,
        dataType: this.pgTypeToString(field.dataTypeID),
      }));

      logger.info('Query executed successfully', {
        rowCount: result.rowCount,
        executionTimeMs,
        sql: sql.substring(0, 120),
      });

      const resultData: QueryResult = {
        sql,
        rows: result.rows,
        columns,
        rowCount: result.rowCount || 0,
        executionTimeMs,
        visualization: { chartType: 'table', reason: '' }, // Filled by visualization service
      };

      // Store in memory cache
      queryCache.set(hash, {
        data: resultData,
        timestamp: Date.now(),
      });

      return resultData;
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      logger.error('Query execution failed', {
        error: (error as Error).message,
        executionTimeMs,
        sql: sql.substring(0, 200),
      });
      throw error;
    }
  }

  /**
   * Create a timeout promise that rejects after the specified duration.
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms);
    });
  }

  /**
   * Map PostgreSQL type OIDs to human-readable names.
   */
  private pgTypeToString(typeId: number): string {
    const typeMap: Record<number, string> = {
      16: 'boolean',
      20: 'bigint',
      21: 'smallint',
      23: 'integer',
      25: 'text',
      700: 'float4',
      701: 'float8',
      1043: 'varchar',
      1082: 'date',
      1114: 'timestamp',
      1184: 'timestamptz',
      1700: 'numeric',
      2950: 'uuid',
      3802: 'jsonb',
    };
    return typeMap[typeId] || 'text';
  }
  /**
   * Lazy garbage collection for expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of queryCache.entries()) {
      if (now - entry.timestamp > QUERY_CACHE_TTL_MS) {
        queryCache.delete(key);
      }
    }
  }
}

export const queryService = new QueryService();
