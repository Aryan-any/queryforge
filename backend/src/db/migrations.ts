import { Pool } from 'pg';
import logger from '../utils/logger';

/**
 * Create dashboard metadata tables if they don't exist.
 * These tables store dashboard and widget configurations.
 */
export async function runMigrations(pool: Pool): Promise<void> {
  const ddl = `
    CREATE TABLE IF NOT EXISTS dashboards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      share_token VARCHAR(255) UNIQUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS share_token VARCHAR(255) UNIQUE;
    
    -- Ensure backward compatibility with existing tables
    DO $$ 
    BEGIN 
      BEGIN
        ALTER TABLE dashboard_widgets ADD COLUMN cached_data JSONB;
      EXCEPTION
        WHEN undefined_table THEN
          -- Do nothing, table doesn't exist yet
        WHEN duplicate_column THEN
          -- Do nothing, column already exists
      END;
    END $$;

    CREATE TABLE IF NOT EXISTS dashboard_widgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      query_text TEXT NOT NULL,
      sql_text TEXT NOT NULL,
      chart_type VARCHAR(20) NOT NULL DEFAULT 'table',
      config JSONB DEFAULT '{}',
      position JSONB DEFAULT '{"x":0,"y":0,"w":6,"h":4}',
      cached_data JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
  `;

  try {
    await pool.query(ddl);
    logger.info('Dashboard metadata tables ready');
  } catch (error) {
    logger.error('Migration failed', { error: (error as Error).message });
    throw error;
  }
}
