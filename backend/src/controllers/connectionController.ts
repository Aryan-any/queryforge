import { Router, Request, Response } from 'express';
import { connectionService } from '../services/connectionService';
import { ConnectionConfig } from '../utils/types';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/connections/test
 * Test a database connection without establishing it.
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { host, port, database, user, password, ssl } = req.body as ConnectionConfig;

    if (!host || !database || !user) {
      res.status(400).json({
        success: false,
        error: 'Host, database, and user are required',
      });
      return;
    }

    const isValid = await connectionService.testConnection({
      host,
      port: port || 5432,
      database,
      user,
      password: password || '',
      ssl: ssl || false,
    });

    res.json({
      success: true,
      data: { connected: isValid },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Connection test failed: ${(error as Error).message}`,
    });
  }
});

/**
 * POST /api/connections/connect
 * Establish a connection to a user-provided database.
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { host, port, database, user, password, ssl } = req.body as ConnectionConfig;

    if (!host || !database || !user) {
      res.status(400).json({
        success: false,
        error: 'Host, database, and user are required',
      });
      return;
    }

    const connConfig: ConnectionConfig = {
      host,
      port: port || 5432,
      database,
      user,
      password: password || '',
      ssl: ssl || false,
    };

    // Test the connection first
    const isValid = await connectionService.testConnection(connConfig);
    if (!isValid) {
      res.status(400).json({
        success: false,
        error: 'Could not connect to the database. Please check your credentials.',
      });
      return;
    }

    // Create the pool
    const connectionId = uuidv4();
    connectionService.connect(connectionId, connConfig);

    // Store in session
    req.session.activeConnection = connConfig;
    req.session.connectionId = connectionId;

    logger.info('User connected to custom database', { database, host });

    res.json({
      success: true,
      data: {
        connectionId,
        database,
        host,
        message: 'Connected successfully',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Connection failed: ${(error as Error).message}`,
    });
  }
});

/**
 * POST /api/connections/demo
 * Connect to the demo ecommerce database.
 */
router.post('/demo', (req: Request, res: Response) => {
  try {
    // Verify demo pool is accessible
    connectionService.getDemoPool();
    
    // Store in session
    req.session.activeConnection = 'demo';
    req.session.connectionId = 'demo';

    logger.info('User connected to demo database');

    res.json({
      success: true,
      data: {
        connectionId: 'demo',
        database: 'QueryForge Demo (E-commerce)',
        message: 'Connected to demo database',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Could not connect to demo database: ${(error as Error).message}`,
    });
  }
});

/**
 * POST /api/connections/disconnect
 * Disconnect the current database connection.
 */
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    if (req.session.connectionId && req.session.connectionId !== 'demo') {
      await connectionService.disconnect(req.session.connectionId);
    }

    req.session.activeConnection = undefined;
    req.session.connectionId = undefined;

    res.json({ success: true, message: 'Disconnected' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Disconnect failed: ${(error as Error).message}`,
    });
  }
});

export default router;
