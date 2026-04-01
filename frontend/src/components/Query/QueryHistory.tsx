import { useAppStore } from '../../stores/appStore';
import { ScrollText } from 'lucide-react';

export default function QueryHistory() {
  const { queryHistory, clearConversation } = useAppStore();

  if (queryHistory.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
      <div className="card-header">
        <span className="card-title" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ScrollText size={16} /> Query History
        </span>
        <button className="btn btn-ghost btn-sm" onClick={clearConversation}>
          Clear
        </button>
      </div>
      <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {queryHistory.map((item, idx) => (
          <div
            key={idx}
            className="query-history-item"
            onClick={() => {
              // Re-populate the query input
              const input = document.getElementById('query-input') as HTMLInputElement;
              if (input) {
                input.value = item.question;
                input.focus();
              }
            }}
          >
            <div className="query-history-question">{item.question}</div>
            <div className="query-history-time">
              {new Date(item.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
