import { useAppStore } from '../../stores/appStore';
import { logout } from '../../services/authService';
import { Search, Database, LayoutDashboard, Zap, X, LogOut } from 'lucide-react';

export default function Sidebar({ mobileOpen, closeMobile }: { mobileOpen?: boolean; closeMobile?: () => void }) {
  const {
    activeTab, setActiveTab,
    isConnected, connectionType, connectionDatabase,
    username, sidebarOpen,
    apiKey, setApiKey,
    llmProvider, setLLMProvider,
  } = useAppStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch { /* ignore */ }
    useAppStore.getState().setAuth(false);
    useAppStore.getState().setConnection(false);
  };

  const navItems = [
    { id: 'query' as const, label: 'Query', icon: <Search size={18} /> },
    { id: 'schema' as const, label: 'Schema Explorer', icon: <Database size={18} /> },
    { id: 'dashboard' as const, label: 'Dashboards', icon: <LayoutDashboard size={18} /> },
  ];

  return (
    <aside className={`app-sidebar${sidebarOpen ? '' : ' collapsed'}${mobileOpen ? ' mobile-open' : ''}`}>
      {/* Mobile Close Button */}
      {mobileOpen && (
        <button 
          className="btn btn-ghost" 
          onClick={closeMobile}
          style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '1.2rem', padding: '4px' }}
        >
          <X size={20} />
        </button>
      )}
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={20} fill="white" stroke="white" />
        </div>
        <h1>QueryForge</h1>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <div
            key={item.id}
            className={`sidebar-nav-item${activeTab === item.id ? ' active' : ''}`}
            onClick={() => {
              setActiveTab(item.id);
              if (closeMobile) closeMobile();
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      {/* API Key Configuration */}
      <div className="api-key-section">
        <div className="sidebar-section-title">LLM Configuration</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          <select
            className="select"
            value={llmProvider}
            onChange={(e) => setLLMProvider(e.target.value)}
          >
            <option value="openai">OpenAI (GPT-4o Mini - Ultra Fast)</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
          </select>
          <div className="api-key-input-wrapper">
            <input
              className="input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key"
            />
          </div>
          {!apiKey && (
            <p style={{ fontSize: '0.7rem', color: 'var(--accent-warning)' }}>
              ⚠ API key required for queries
            </p>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="connection-status">
        <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="connection-dot" />
          {isConnected
            ? (connectionType === 'demo' ? 'Demo Database' : connectionDatabase || 'Connected')
            : 'Not Connected'}
        </div>
      </div>

      {/* User / Logout */}
      <div className="sidebar-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(79,70,229,0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {username?.[0]?.toUpperCase() || 'U'}
          </div>
          {username}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ padding: '6px' }} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
