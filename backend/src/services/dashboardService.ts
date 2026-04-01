import { Pool } from 'pg';
import crypto from 'crypto';
import { Dashboard, DashboardWidget, WidgetPosition, WidgetConfig, ChartType } from '../utils/types';
import logger from '../utils/logger';

/**
 * Dashboard Persistence Service
 * 
 * CRUD operations for dashboards and their widgets.
 * Stores data in the demo/connected database's dashboard metadata tables.
 */
export class DashboardService {
  /**
   * List all dashboards.
   */
  async listDashboards(pool: Pool): Promise<Dashboard[]> {
    const result = await pool.query(`
      SELECT id, name, description, created_at, updated_at
      FROM dashboards
      ORDER BY updated_at DESC
    `);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      shareToken: row.share_token,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      widgets: [],
    }));
  }

  /**
   * Get a dashboard with all its widgets.
   */
  async getDashboard(pool: Pool, dashboardId: string): Promise<Dashboard | null> {
    const dashResult = await pool.query(
      'SELECT id, name, description, share_token, created_at, updated_at FROM dashboards WHERE id = $1',
      [dashboardId]
    );

    if (dashResult.rows.length === 0) return null;

    const dash = dashResult.rows[0];

    const widgetsResult = await pool.query(
      `SELECT id, dashboard_id, title, query_text, sql_text, chart_type, config, position, cached_data, created_at
       FROM dashboard_widgets
       WHERE dashboard_id = $1
       ORDER BY created_at ASC`,
      [dashboardId]
    );

    const widgets: DashboardWidget[] = widgetsResult.rows.map(row => ({
      id: row.id,
      dashboardId: row.dashboard_id,
      title: row.title,
      query: row.query_text,
      sql: row.sql_text,
      chartType: row.chart_type as ChartType,
      config: row.config || {},
      position: row.position || { x: 0, y: 0, w: 6, h: 4 },
      cachedData: row.cached_data,
      createdAt: row.created_at,
    }));

    return {
      id: dash.id,
      name: dash.name,
      description: dash.description,
      shareToken: dash.share_token,
      createdAt: dash.created_at,
      updatedAt: dash.updated_at,
      widgets,
    };
  }

  /**
   * Get a dashboard by its public share token.
   */
  async getDashboardByShareToken(pool: Pool, shareToken: string): Promise<Dashboard | null> {
    const dashResult = await pool.query(
      'SELECT id, name, description, share_token, created_at, updated_at FROM dashboards WHERE share_token = $1',
      [shareToken]
    );

    if (dashResult.rows.length === 0) return null;

    const dash = dashResult.rows[0];

    // Fetch widgets using the dashboard ID
    const widgetsResult = await pool.query(
      `SELECT id, dashboard_id, title, query_text, sql_text, chart_type, config, position, cached_data, created_at
       FROM dashboard_widgets
       WHERE dashboard_id = $1
       ORDER BY created_at ASC`,
      [dash.id]
    );

    const widgets: DashboardWidget[] = widgetsResult.rows.map(row => ({
      id: row.id,
      dashboardId: row.dashboard_id,
      title: row.title,
      query: row.query_text,
      sql: row.sql_text,
      chartType: row.chart_type as ChartType,
      config: row.config || {},
      position: row.position || { x: 0, y: 0, w: 6, h: 4 },
      cachedData: row.cached_data,
      createdAt: row.created_at,
    }));

    return {
      id: dash.id,
      name: dash.name,
      description: dash.description,
      shareToken: dash.share_token,
      createdAt: dash.created_at,
      updatedAt: dash.updated_at,
      widgets,
    };
  }

  /**
   * Create a new dashboard.
   */
  async createDashboard(pool: Pool, name: string, description?: string): Promise<Dashboard> {
    const shareToken = crypto.randomUUID();
    const result = await pool.query(
      'INSERT INTO dashboards (name, description, share_token) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, shareToken]
    );

    const row = result.rows[0];
    logger.info('Dashboard created', { id: row.id, name, shareToken });

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      shareToken: row.share_token,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      widgets: [],
    };
  }

  /**
   * Update a dashboard's metadata.
   */
  async updateDashboard(pool: Pool, dashboardId: string, name: string, description?: string): Promise<Dashboard | null> {
    const result = await pool.query(
      'UPDATE dashboards SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name, description || null, dashboardId]
    );

    if (result.rows.length === 0) return null;

    return this.getDashboard(pool, dashboardId);
  }

  /**
   * Delete a dashboard and all its widgets.
   */
  async deleteDashboard(pool: Pool, dashboardId: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM dashboards WHERE id = $1', [dashboardId]);
    logger.info('Dashboard deleted', { id: dashboardId });
    return (result.rowCount || 0) > 0;
  }

  /**
   * Add a widget to a dashboard.
   */
  async addWidget(
    pool: Pool,
    dashboardId: string,
    widget: {
      title: string;
      query: string;
      sql: string;
      chartType: ChartType;
      config?: WidgetConfig;
      position?: WidgetPosition;
      cachedData?: Record<string, unknown>[];
    }
  ): Promise<DashboardWidget> {
    const result = await pool.query(
      `INSERT INTO dashboard_widgets (dashboard_id, title, query_text, sql_text, chart_type, config, position, cached_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        dashboardId,
        widget.title,
        widget.query,
        widget.sql,
        widget.chartType,
        JSON.stringify(widget.config || {}),
        JSON.stringify(widget.position || { x: 0, y: 0, w: 6, h: 4 }),
        widget.cachedData ? JSON.stringify(widget.cachedData) : null,
      ]
    );

    const row = result.rows[0];
    // Update dashboard timestamp
    await pool.query('UPDATE dashboards SET updated_at = NOW() WHERE id = $1', [dashboardId]);

    logger.info('Widget added', { dashboardId, widgetId: row.id });

    return {
      id: row.id,
      dashboardId: row.dashboard_id,
      title: row.title,
      query: row.query_text,
      sql: row.sql_text,
      chartType: row.chart_type,
      config: row.config,
      position: row.position,
      cachedData: row.cached_data,
      createdAt: row.created_at,
    };
  }

  /**
   * Update a widget.
   */
  async updateWidget(
    pool: Pool,
    widgetId: string,
    updates: Partial<{
      title: string;
      chartType: ChartType;
      config: WidgetConfig;
      position: WidgetPosition;
      cachedData: Record<string, unknown>[];
    }>
  ): Promise<DashboardWidget | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIdx++}`);
      params.push(updates.title);
    }
    if (updates.chartType !== undefined) {
      setClauses.push(`chart_type = $${paramIdx++}`);
      params.push(updates.chartType);
    }
    if (updates.config !== undefined) {
      setClauses.push(`config = $${paramIdx++}`);
      params.push(JSON.stringify(updates.config));
    }
    if (updates.position !== undefined) {
      setClauses.push(`position = $${paramIdx++}`);
      params.push(JSON.stringify(updates.position));
    }
    if (updates.cachedData !== undefined) {
      setClauses.push(`cached_data = $${paramIdx++}`);
      params.push(updates.cachedData ? JSON.stringify(updates.cachedData) : null);
    }

    if (setClauses.length === 0) return null;

    params.push(widgetId);
    const result = await pool.query(
      `UPDATE dashboard_widgets SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      dashboardId: row.dashboard_id,
      title: row.title,
      query: row.query_text,
      sql: row.sql_text,
      chartType: row.chart_type,
      config: row.config,
      position: row.position,
      cachedData: row.cached_data,
      createdAt: row.created_at,
    };
  }

  /**
   * Delete a widget.
   */
  async deleteWidget(pool: Pool, widgetId: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM dashboard_widgets WHERE id = $1', [widgetId]);
    logger.info('Widget deleted', { widgetId });
    return (result.rowCount || 0) > 0;
  }
}

export const dashboardService = new DashboardService();
