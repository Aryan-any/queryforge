import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { getSchema } from '../../services/schemaService';
import type { TableInfo } from '../../utils/types';
import { Database, ClipboardList, RefreshCw, Link, TableProperties, Columns, Network, Hash } from 'lucide-react';

export default function SchemaExplorer() {
  const { schema, schemaLoading, setSchema, setSchemaLoading, isConnected } = useAppStore();
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isConnected && !schema) {
      loadSchema();
    }
  }, [isConnected]);

  const loadSchema = async () => {
    setSchemaLoading(true);
    try {
      const result = await getSchema();
      if (result.success && result.data) {
        setSchema(result.data);
      }
    } catch (err) {
      console.error('Schema load failed:', err);
    }
    setSchemaLoading(false);
  };

  if (!isConnected) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" style={{ color: 'var(--border-accent)' }}>
          <Database size={48} strokeWidth={1.5} />
        </div>
        <div className="empty-state-title">Connect to a Database</div>
        <div className="empty-state-description">
          Connect to a database to explore its schema, tables, and relationships.
        </div>
      </div>
    );
  }

  if (schemaLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <div className="loading-text">Analyzing database schema…</div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" style={{ color: 'var(--border-accent)' }}>
          <ClipboardList size={48} strokeWidth={1.5} />
        </div>
        <div className="empty-state-title">No Schema Data</div>
        <button className="btn btn-primary" onClick={loadSchema}>Load Schema</button>
      </div>
    );
  }

  const filteredTables = schema.tables.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !['dashboards', 'dashboard_widgets'].includes(t.name)
  );

  const fkColumnNames = new Set<string>();
  schema.tables.forEach(t => t.foreignKeys.forEach(fk => fkColumnNames.add(`${t.name}.${fk.columnName}`)));

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <input
          className="input"
          placeholder="Search tables…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <button className="btn btn-ghost btn-sm" onClick={loadSchema}>
          <RefreshCw size={14} /> Refresh
        </button>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filteredTables.length} tables • Generated {new Date(schema.generatedAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Stat cards */}
      <div className="stat-row" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="stat-card">
          <span className="stat-label"><TableProperties size={14} /> Tables</span>
          <span className="stat-value">{filteredTables.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label"><Columns size={14} /> Columns</span>
          <span className="stat-value">{filteredTables.reduce((a, t) => a + t.columns.length, 0)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label"><Network size={14} /> Relationships</span>
          <span className="stat-value">{schema.relationships.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label"><Hash size={14} /> Total Rows</span>
          <span className="stat-value">{filteredTables.reduce((a, t) => a + t.rowCount, 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Table list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {filteredTables.map((table) => (
          <TableItem
            key={table.name}
            table={table}
            expanded={expandedTable === table.name}
            onToggle={() => setExpandedTable(expandedTable === table.name ? null : table.name)}
            fkColumns={fkColumnNames}
          />
        ))}
      </div>

      {/* Relationships */}
      {schema.relationships.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link size={16} className="text-accent-primary" /> Relationships
          </div>
          <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {schema.relationships.map((r, i) => (
              <div key={i} style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', padding: '4px 0' }}>
                <span style={{ color: 'var(--accent-secondary)' }}>{r.fromTable}</span>.{r.fromColumn}
                <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>→</span>
                <span style={{ color: 'var(--accent-purple)' }}>{r.toTable}</span>.{r.toColumn}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TableItem({ table, expanded, onToggle, fkColumns }: {
  table: TableInfo;
  expanded: boolean;
  onToggle: () => void;
  fkColumns: Set<string>;
}) {
  return (
    <div className={`schema-table-item${expanded ? ' active' : ''}`} onClick={onToggle}>
      <div className="schema-table-name">
        <span>{expanded ? '📂' : '📁'}</span>
        {table.name}
        <span className="schema-table-count">
          ({table.columns.length} cols • {table.rowCount.toLocaleString()} rows)
        </span>
      </div>
      {expanded && (
        <div className="schema-column-list" onClick={(e) => e.stopPropagation()}>
          {table.columns.map((col, i) => (
            <div key={i} className="schema-column">
              <span className="schema-column-name">{col.name}</span>
              <span className="schema-column-type">{col.dataType}</span>
              {col.isPrimaryKey && <span className="schema-pk-badge">PK</span>}
              {fkColumns.has(`${table.name}.${col.name}`) && <span className="schema-fk-badge">FK</span>}
              {col.sampleValues && col.sampleValues.length > 0 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                  ({col.sampleValues.slice(0, 5).join(', ')})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
