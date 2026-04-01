import { Router, Request, Response } from 'express';
import { schemaService } from '../services/schemaService';
import { connectionService } from '../services/connectionService';
import logger from '../utils/logger';

const router = Router();

// In-memory schema cache (per connection)
const schemaCache = new Map<string, { schema: ReturnType<typeof schemaService.getSchema> extends Promise<infer T> ? T : never; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/schema
 * Get full schema for the active database connection.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = connectionService.getActivePool(
      req.session.activeConnection,
      req.session.connectionId
    );

    const cacheKey = req.session.connectionId || 'demo';
    const cached = schemaCache.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      res.json({ success: true, data: cached.schema });
      return;
    }

    const schema = await schemaService.getSchema(pool);
    schemaCache.set(cacheKey, { schema, cachedAt: Date.now() });

    res.json({ success: true, data: schema });
  } catch (error) {
    logger.error('Schema fetch failed', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/schema/summary
 * Get human-readable schema summary.
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const pool = connectionService.getActivePool(
      req.session.activeConnection,
      req.session.connectionId
    );

    const cacheKey = req.session.connectionId || 'demo';
    const cached = schemaCache.get(cacheKey);
    let schema;

    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      schema = cached.schema;
    } else {
      schema = await schemaService.getSchema(pool);
      schemaCache.set(cacheKey, { schema, cachedAt: Date.now() });
    }

    const summary = schemaService.generateSummary(schema);
    res.json({ success: true, data: { summary } });
  } catch (error) {
    logger.error('Schema summary failed', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/schema/cache
 * Clear the schema cache (useful after schema changes).
 */
router.delete('/cache', (req: Request, res: Response) => {
  const cacheKey = req.session.connectionId || 'demo';
  schemaCache.delete(cacheKey);
  res.json({ success: true, message: 'Schema cache cleared' });
});

export default router;
