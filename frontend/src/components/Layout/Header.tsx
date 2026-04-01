import { useAppStore } from '../../stores/appStore';

export default function Header() {
  const { toggleSidebar, activeTab, isConnected } = useAppStore();

  const tabTitles: Record<string, string> = {
    query: 'Natural Language Query',
    schema: 'Schema Explorer',
    dashboard: 'Dashboard Builder',
  };

  return (
    <header className="app-header">
      <button className="btn btn-ghost btn-icon" onClick={toggleSidebar} title="Toggle sidebar">
        ☰
      </button>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{tabTitles[activeTab] || 'QueryForge'}</h2>
      <div style={{ flex: 1 }} />
      {!isConnected && (
        <span className="badge badge-warning">No database connected</span>
      )}
    </header>
  );
}
