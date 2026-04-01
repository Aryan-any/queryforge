import { useAppStore } from '../stores/appStore';
import ConnectionManager from '../components/Connection/ConnectionManager';
import QueryInput from '../components/Query/QueryInput';
import QueryHistory from '../components/Query/QueryHistory';
import ChartRenderer from '../components/Charts/ChartRenderer';
import { MessageSquare, Rows3, Timer, Cpu, TerminalSquare, Sparkles, AlertCircle } from 'lucide-react';

export default function QueryPage() {
  const { currentResult, queryLoading, queryError } = useAppStore();

  return (
    <div>
      <ConnectionManager />

      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} style={{ color: 'var(--accent-primary)' }} /> Ask your data a question
          </span>
        </div>
        <QueryInput />
      </div>

      {/* Loading */}
      {queryLoading && (
        <div className="card">
          <div className="loading-container">
            <div className="loading-spinner" />
            <div className="loading-text">Generating SQL and querying your database…</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {queryError && !queryLoading && (
        <div className="card" style={{ borderColor: 'var(--accent-danger)' }}>
          <div className="card-header" style={{ color: 'var(--accent-danger)', gap: '8px' }}>
            <AlertCircle size={18} />
            <span className="card-title">Query Generation Failed</span>
          </div>
          <div style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)' }}>
            <p style={{ marginBottom: '8px' }}>We encountered an error while processing your question:</p>
            <pre style={{ background: 'var(--bg-primary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
              {queryError}
            </pre>
            <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>
              Please check your database connection or LLM API keys. (If you asked a complex question, the LLM context window might have exceeded its limits).
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {currentResult && !queryLoading && !queryError && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Stats */}
          <div className="stat-row">
            <div className="stat-card">
              <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Rows3 size={14} /> Rows Returned
              </span>
              <span className="stat-value">{currentResult.rowCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Timer size={14} /> Execution Time
              </span>
              <span className="stat-value">{currentResult.executionTimeMs}ms</span>
            </div>
            {currentResult.llm && (
              <div className="stat-card">
                <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Cpu size={14} /> LLM Model
                </span>
                <span className="stat-value" style={{ fontSize: '1rem' }}>{currentResult.llm.model}</span>
              </div>
            )}
          </div>

          {/* Generated SQL */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TerminalSquare size={14} /> Generated SQL
              </span>
            </div>
            <div className="sql-display">{currentResult.sql}</div>
          </div>

          {/* Chart */}
          <div className="card">
            <ChartRenderer result={currentResult} />
          </div>
        </div>
      )}

      {!currentResult && !queryLoading && !queryError && (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', color: 'var(--border-accent)' }}>
            <Sparkles size={48} strokeWidth={1.5} />
          </div>
          <div className="empty-state-title">Ask a question to get started</div>
          <div className="empty-state-description">
            Type a natural language question about your data. QueryForge will generate SQL,
            execute it, and visualize the results automatically.
          </div>
        </div>
      )}

      <QueryHistory />
    </div>
  );
}
