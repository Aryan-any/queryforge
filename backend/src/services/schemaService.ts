import { Pool } from 'pg';
import { SchemaInfo, TableInfo, ColumnInfo, ForeignKey, IndexInfo, Relationship } from '../utils/types';
import logger from '../utils/logger';
import crypto from 'crypto';

interface SchemaCacheEntry {
  schema: SchemaInfo;
  timestamp: number;
}
const SCHEMA_TTL_MS = 1000 * 60 * 60; // 1 hour cache
const schemaCache = new Map<string, SchemaCacheEntry>();

/**
 * Schema Analysis Engine
 * 
 * Introspects PostgreSQL databases using information_schema and pg_catalog
 * to extract table structures, relationships, indexes, and sample values.
 */
export class SchemaService {
  /**
   * Full schema introspection for a database.
   */
  async getSchema(pool: Pool): Promise<SchemaInfo> {
    const poolConfig = (pool as any).options;
    const dbId = poolConfig ? `${poolConfig.host}:${poolConfig.database}:${poolConfig.user}` : 'demo';
    const hash = crypto.createHash('md5').update(dbId).digest('hex');

    const cached = schemaCache.get(hash);
    if (cached && (Date.now() - cached.timestamp < SCHEMA_TTL_MS)) {
      logger.info('Schema cache hit, circumventing sequential introspection queries', { dbId });
      return cached.schema;
    }

    const tables = await this.getTables(pool);
    const relationships = this.extractRelationships(tables);

    const schema: SchemaInfo = {
      tables,
      relationships,
      generatedAt: new Date().toISOString(),
    };

    schemaCache.set(hash, { schema, timestamp: Date.now() });
    
    // Optional lazy gc
    if (Math.random() < 0.05) {
      const now = Date.now();
      for (const [k, v] of schemaCache.entries()) {
        if (now - v.timestamp > SCHEMA_TTL_MS) schemaCache.delete(k);
      }
    }

    return schema;
  }

  /**
   * Get all user tables with columns, foreign keys, indexes, and sample values.
   */
  private async getTables(pool: Pool): Promise<TableInfo[]> {
    // Get all tables in the public schema (limit to 100 to protect LLM context windows)
    const tablesResult = await pool.query(`
      SELECT table_name, table_schema
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
      LIMIT 100
    `);

    const tables: TableInfo[] = [];
    const chunkSize = 5; // Scale concurrency without overloading connection pool limits

    for (let i = 0; i < tablesResult.rows.length; i += chunkSize) {
      const chunk = tablesResult.rows.slice(i, i + chunkSize);
      
      const chunkPromises = chunk.map(async (row) => {
        const tableName = row.table_name;
        const tableSchema = row.table_schema;

        const [columns, foreignKeys, indexes, rowCount] = await Promise.all([
          this.getColumns(pool, tableName),
          this.getForeignKeys(pool, tableName),
          this.getIndexes(pool, tableName),
          this.getRowCount(pool, tableName),
        ]);

        await this.populateSampleValues(pool, tableName, columns);

        return {
          name: tableName,
          schema: tableSchema,
          columns,
          foreignKeys,
          indexes,
          rowCount,
        };
      });
      
      const resolvedChunk = await Promise.all(chunkPromises);
      tables.push(...resolvedChunk);
    }

    return tables;
  }

  /**
   * Get columns for a table including data types, nullability, and primary key status.
   */
  private async getColumns(pool: Pool, tableName: string): Promise<ColumnInfo[]> {
    const result = await pool.query(`
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = $1
          AND tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
      ) pk ON pk.column_name = c.column_name
      WHERE c.table_name = $1
        AND c.table_schema = 'public'
      ORDER BY c.ordinal_position
    `, [tableName]);

    return result.rows.map(row => ({
      name: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable === 'YES',
      isPrimaryKey: row.is_primary_key,
      defaultValue: row.column_default,
      characterMaxLength: row.character_maximum_length,
    }));
  }

  /**
   * Get foreign key relationships for a table.
   */
  private async getForeignKeys(pool: Pool, tableName: string): Promise<ForeignKey[]> {
    const result = await pool.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = $1
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `, [tableName]);

    return result.rows.map(row => ({
      constraintName: row.constraint_name,
      columnName: row.column_name,
      referencedTable: row.referenced_table,
      referencedColumn: row.referenced_column,
    }));
  }

  /**
   * Get indexes for a table.
   */
  private async getIndexes(pool: Pool, tableName: string): Promise<IndexInfo[]> {
    const result = await pool.query(`
      SELECT
        i.relname AS index_name,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = $1
        AND t.relkind = 'r'
      GROUP BY i.relname, ix.indisunique, ix.indisprimary
    `, [tableName]);

    return result.rows.map(row => ({
      name: row.index_name,
      columns: row.columns,
      isUnique: row.is_unique,
      isPrimary: row.is_primary,
    }));
  }

  /**
   * Get estimated row count for a table.
   */
  private async getRowCount(pool: Pool, tableName: string): Promise<number> {
    try {
      // Use pg_stat for fast estimation on large tables
      const result = await pool.query(`
        SELECT reltuples::bigint AS estimate
        FROM pg_class
        WHERE relname = $1
      `, [tableName]);

      const estimate = parseInt(result.rows[0]?.estimate || '0');
      
      // If estimate is low/zero, do a real count
      if (estimate < 1000) {
        const countResult = await pool.query(`SELECT COUNT(*) FROM "${tableName}"`);
        return parseInt(countResult.rows[0].count);
      }
      
      return estimate;
    } catch {
      return 0;
    }
  }

  /**
   * Sample distinct values for categorical columns (varchar, text with low cardinality).
   */
  private async populateSampleValues(pool: Pool, tableName: string, columns: ColumnInfo[]): Promise<void> {
    const categoricalTypes = ['character varying', 'text', 'varchar', 'char'];
    
    for (const col of columns) {
      if (categoricalTypes.includes(col.dataType) && !col.name.includes('email') && !col.name.includes('password')) {
        try {
          const result = await pool.query(`
            SELECT DISTINCT SUBSTRING("${col.name}"::text FROM 1 FOR 50) AS val
            FROM "${tableName}"
            WHERE "${col.name}" IS NOT NULL
            LIMIT 20
          `);
          
          const values = result.rows.map(r => r.val).filter(Boolean);
          // Only include if cardinality is reasonably low (likely categorical)
          if (values.length <= 20 && values.length > 0) {
            col.sampleValues = values;
          }
        } catch (error) {
          logger.debug(`Could not sample values for ${tableName}.${col.name}`, { error: (error as Error).message });
        }
      }
    }
  }

  /**
   * Extract relationships from foreign key data.
   */
  private extractRelationships(tables: TableInfo[]): Relationship[] {
    const relationships: Relationship[] = [];

    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        relationships.push({
          fromTable: table.name,
          fromColumn: fk.columnName,
          toTable: fk.referencedTable,
          toColumn: fk.referencedColumn,
          type: 'many-to-one',
        });
      }
    }

    return relationships;
  }

  /**
   * Generate a human-readable schema summary for LLM consumption.
   */
  generateSummary(schema: SchemaInfo): string {
    const lines: string[] = ['DATABASE SCHEMA SUMMARY', '='.repeat(50), ''];

    for (const table of schema.tables) {
      lines.push(`Table: ${table.name} (${table.rowCount} rows)`);
      lines.push('-'.repeat(40));

      for (const col of table.columns) {
        const flags: string[] = [];
        if (col.isPrimaryKey) flags.push('PRIMARY KEY');
        if (!col.isNullable) flags.push('NOT NULL');
        if (col.defaultValue) flags.push(`DEFAULT: ${col.defaultValue}`);
        
        const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
        lines.push(`  - ${col.name} (${col.dataType})${flagStr}`);
        
        if (col.sampleValues && col.sampleValues.length > 0) {
          lines.push(`    Sample values: ${col.sampleValues.slice(0, 10).join(', ')}`);
        }
      }

      if (table.foreignKeys.length > 0) {
        lines.push('');
        lines.push('  Foreign Keys:');
        for (const fk of table.foreignKeys) {
          lines.push(`    ${table.name}.${fk.columnName} → ${fk.referencedTable}.${fk.referencedColumn}`);
        }
      }

      lines.push('');
    }

    if (schema.relationships.length > 0) {
      lines.push('RELATIONSHIPS', '='.repeat(50));
      for (const rel of schema.relationships) {
        lines.push(`  ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn} (${rel.type})`);
      }
    }

    return lines.join('\n');
  }
}

export const schemaService = new SchemaService();
