import { useEffect, useState } from 'react';
import { useAppStore } from './stores/appStore';
import { checkSession } from './services/authService';
import LoginForm from './components/Auth/LoginForm';
import Layout from './components/Layout/Layout';
import QueryPage from './pages/QueryPage';
import SchemaPage from './pages/SchemaPage';
import DashboardPage from './pages/DashboardPage';
import SharedDashboardPage from './pages/SharedDashboardPage';

export default function App() {
  const { isAuthenticated, setAuth, activeTab } = useAppStore();
  const [checking, setChecking] = useState(true);

  // If URL starts with /share/ rendering unauthenticated Shared Dash view
  const pathname = window.location.pathname;
  if (pathname.startsWith('/share/')) {
    const token = pathname.split('/share/')[1];
    return <SharedDashboardPage token={token} />;
  }

  // Check session on mount
  useEffect(() => {
    const check = async () => {
      try {
        const result = await checkSession();
        if (result.success && result.data?.authenticated) {
          setAuth(true, result.data.username);
          if (result.data.hasConnection) {
            useAppStore.getState().setConnection(
              true,
              result.data.connectionType as 'demo' | 'custom',
            );
          }
        }
      } catch {
        // Not authenticated
      }
      setChecking(false);
    };
    check();
  }, [setAuth]);

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">Loading QueryForge…</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'query': return <QueryPage />;
      case 'schema': return <SchemaPage />;
      case 'dashboard': return <DashboardPage />;
      default: return <QueryPage />;
    }
  };

  return (
    <Layout>
      {renderPage()}
    </Layout>
  );
}
