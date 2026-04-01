import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAppStore } from '../../stores/appStore';
import { executeQuery } from '../../services/queryService';

export default function QueryInput() {
  const [question, setQuestion] = useState('');
  const {
    apiKey, llmProvider, queryLoading, setQueryLoading,
    setCurrentResult, conversationHistory,
    addConversationEntry, addQueryHistory,
    isConnected, setSelectedChartType,
    setQueryError,
  } = useAppStore();

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || queryLoading || !isConnected || !apiKey) return;

    setQueryLoading(true);
    setQueryError(null);
    setSelectedChartType(null);

    try {
      // Add user entry to conversation
      addConversationEntry({ role: 'user', question: question.trim() });

      const result = await executeQuery(question.trim(), apiKey, conversationHistory, llmProvider);

      if (result.success && result.data) {
        setCurrentResult(result.data);
        addConversationEntry({
          role: 'assistant',
          sql: result.data.sql,
          summary: `Returned ${result.data.rowCount} rows in ${result.data.executionTimeMs}ms`,
        });
        addQueryHistory(question.trim(), result.data.sql);
        setQuestion('');
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      const errorMsg = axiosError.response?.data?.error || (err as Error).message || 'Query failed';
      setCurrentResult(null);
      setQueryError(errorMsg);
      addConversationEntry({ role: 'assistant', summary: `Error: ${errorMsg}` });
    } finally {
      setQueryLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const suggestions = [
    'What are the top 10 products by revenue?',
    'Show monthly revenue for the last 6 months',
    'Which customers have the highest order totals?',
    'Average order value by state',
    'Products with the best reviews',
  ];

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="query-input-container">
          <input
            className="query-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !isConnected
                ? 'Connect to a database first…'
                : !apiKey
                ? 'Set your API key in the sidebar…'
                : 'Ask a question about your data…'
            }
            disabled={!isConnected || !apiKey || queryLoading}
            id="query-input"
          />
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={!question.trim() || queryLoading || !isConnected || !apiKey}
          >
            {queryLoading ? (
              <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              '→'
            )}
          </button>
        </div>
      </form>

      {/* Suggested queries */}
      {!queryLoading && isConnected && apiKey && !useAppStore.getState().currentResult && (
        <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.8rem', border: '1px solid var(--border-subtle)' }}
              onClick={() => setQuestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
