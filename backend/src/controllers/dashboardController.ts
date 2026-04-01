import { Router, Request, Response } from 'express';
import { connectionService } from '../services/connectionService';
import { dashboardService } from '../services/dashboardService';
import { queryService } from '../services/queryService';
import logger from '../utils/logger';

const router = Router();

/**
 * Helper to get the active pool from session.
 */
function getPool(req: Request) {
  return connectionService.getActivePool(
    req.session.activeConnection,
    req.session.connectionId
  );
}

/**
 * GET /api/dashboards/shared/:shareToken
 * Get a dashboard by its public share token.
 * This skips authentication and uses the Demo DB pool by default for shared public views.
 */
router.get('/shared/:shareToken', async (req: Request, res: Response) => {
  try {
    const pool = connectionService.getDemoPool();
    const dashboard = await dashboardService.getDashboardByShareToken(pool, String(req.params.shareToken));
    
    if (!dashboard) {
      res.status(404).json({ success: false, error: 'Shared dashboard not found' });
      return;
    }

    // For public views, we serve the pre-baked snapshot payload instead of directly querying the active pool
    // This allows custom DB dashboards to work completely statelessly over the internet
    const populatedWidgets = dashboard.widgets.map((widget) => {
      if (widget.cachedData) {
        return { 
          ...widget, 
          data: { 
            sql: widget.sql, 
            rows: widget.cachedData, 
            columns: [], // Schema formatting isn't needed for rechart ingestion
            rowCount: widget.cachedData.length,
            executionTimeMs: 0,
            visualization: { chartType: widget.chartType, reason: 'Snapshot cached output' }
          }
        };
      }
      return { ...widget, data: null, error: 'Snapshot data missing from cache' };
    });

    dashboard.widgets = populatedWidgets as any;

    res.json({ success: true, data: dashboard });
  } catch (error) {
    logger.error('Get shared dashboard failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/dashboards
 * List all dashboards.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool(req);
    const dashboards = await dashboardService.listDashboards(pool);
    res.json({ success: true, data: dashboards });
  } catch (error) {
    logger.error('List dashboards failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/dashboards
 * Create a new dashboard.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Dashboard name is required' });
      return;
    }

    const pool = getPool(req);
    const dashboard = await dashboardService.createDashboard(pool, name, description);
    res.status(201).json({ success: true, data: dashboard });
  } catch (error) {
    logger.error('Create dashboard failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/dashboards/:id
 * Get a dashboard with all its widgets.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool(req);
    const dashboard = await dashboardService.getDashboard(pool, String(req.params.id));
    
    if (!dashboard) {
      res.status(404).json({ success: false, error: 'Dashboard not found' });
      return;
    }

    res.json({ success: true, data: dashboard });
  } catch (error) {
    logger.error('Get dashboard failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PUT /api/dashboards/:id
 * Update a dashboard.
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Dashboard name is required' });
      return;
    }

    const pool = getPool(req);
    const dashboard = await dashboardService.updateDashboard(pool, String(req.params.id), name, description);
    
    if (!dashboard) {
      res.status(404).json({ success: false, error: 'Dashboard not found' });
      return;
    }

    res.json({ success: true, data: dashboard });
  } catch (error) {
    logger.error('Update dashboard failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /api/dashboards/:id
 * Delete a dashboard.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool(req);
    const deleted = await dashboardService.deleteDashboard(pool, String(req.params.id));
    
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Dashboard not found' });
      return;
    }

    res.json({ success: true, message: 'Dashboard deleted' });
  } catch (error) {
    logger.error('Delete dashboard failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/dashboards/:id/widgets
 * Add a widget to a dashboard.
 */
router.post('/:id/widgets', async (req: Request, res: Response) => {
  try {
    const { title, query, sql, chartType, config, position } = req.body;
    
    if (!title || !query || !sql || !chartType) {
      res.status(400).json({ success: false, error: 'title, query, sql, and chartType are required' });
      return;
    }

    const pool = getPool(req);
    
    // Snapshot generator - Execute SQL once and store it alongside the definition 
    let cachedData = null;
    try {
      const executionResult = await queryService.execute(pool, sql);
      cachedData = executionResult.rows;
    } catch (e) {
      logger.warn('Failed to generate snapshot for widget caching', { message: (e as Error).message });
    }

    const widget = await dashboardService.addWidget(pool, String(req.params.id), {
      title,
      query,
      sql,
      chartType,
      config,
      position,
      cachedData: cachedData || undefined,
    });

    res.status(201).json({ success: true, data: widget });
  } catch (error) {
    logger.error('Add widget failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PUT /api/dashboards/:dashId/widgets/:widgetId
 * Update a widget.
 */
router.put('/:dashId/widgets/:widgetId', async (req: Request, res: Response) => {
  try {
    const pool = getPool(req);
    
    // If the widget's SQL is being updated, we must rotate the snapshot cache
    let cachedData = undefined;
    if (req.body.sql) {
      try {
        const executionResult = await queryService.execute(pool, req.body.sql);
        cachedData = executionResult.rows;
      } catch (e) {
        logger.warn('Failed to regenerate snapshot on widget update', { message: (e as Error).message });
      }
    }

    const updatePayload = { ...req.body };
    if (cachedData) updatePayload.cachedData = cachedData;

    const widget = await dashboardService.updateWidget(pool, String(req.params.widgetId), updatePayload);
    
    if (!widget) {
      res.status(404).json({ success: false, error: 'Widget not found' });
      return;
    }

    res.json({ success: true, data: widget });
  } catch (error) {
    logger.error('Update widget failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /api/dashboards/:dashId/widgets/:widgetId
 * Delete a widget.
 */
router.delete('/:dashId/widgets/:widgetId', async (req: Request, res: Response) => {
  try {
    const pool = getPool(req);
    const deleted = await dashboardService.deleteWidget(pool, String(req.params.widgetId));
    
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Widget not found' });
      return;
    }

    res.json({ success: true, message: 'Widget deleted' });
  } catch (error) {
    logger.error('Delete widget failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
