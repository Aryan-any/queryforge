import { Pool } from 'pg';
import { ConnectionConfig } from '../utils/types';
import { testConnection, createUserPool, getUserPool, removeUserPool, getDemoPool } from '../db/pool';
import logger from '../utils/logger';

/**
 * Connection Service
 * 
 * Manages database connections including demo DB and user-provided connections.
 */
export class ConnectionService {
  /**
   * Test if a connection configuration is valid.
   */
  async testConnection(connConfig: ConnectionConfig): Promise<boolean> {
    return testConnection(connConfig);
  }

  /**
   * Connect to a user-provided database and return a pool.
   */
  connect(connectionId: string, connConfig: ConnectionConfig): Pool {
    return createUserPool(connectionId, connConfig);
  }

  /**
   * Get the demo database pool.
   */
  getDemoPool(): Pool {
    return getDemoPool();
  }

  /**
   * Get a user pool by connection ID.
   */
  getUserPool(connectionId: string): Pool | null {
    return getUserPool(connectionId);
  }

  /**
   * Get the active pool for a session.
   */
  getActivePool(activeConnection?: ConnectionConfig | 'demo', connectionId?: string): Pool {
    if (!activeConnection) {
      throw new Error('No active database connection. Please connect to a database first.');
    }

    if (activeConnection === 'demo') {
      return this.getDemoPool();
    }

    if (connectionId) {
      const pool = this.getUserPool(connectionId);
      if (pool) return pool;
    }

    throw new Error('Database connection not found. Please reconnect.');
  }

  /**
   * Disconnect a user database.
   */
  async disconnect(connectionId: string): Promise<void> {
    await removeUserPool(connectionId);
    logger.info('Connection disconnected', { connectionId });
  }
}

export const connectionService = new ConnectionService();
