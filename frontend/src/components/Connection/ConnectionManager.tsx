import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { connectDatabase, connectDemo, disconnect, testConnection } from '../../services/connectionService';
import { Server } from 'lucide-react';

export default function ConnectionManager() {
  const { isConnected, connectionType, setConnection } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    host: '', port: '5432', database: '', user: '', password: '', ssl: false,
  });
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleConnectDemo = async () => {
    setConnecting(true);
    setError('');
    try {
      const result = await connectDemo();
      if (result.success && result.data) {
        setConnection(true, 'demo', result.data.database);
        setMessage('Connected to demo database!');
        setShowForm(false);
      } else {
        setError(result.error || 'Connection failed');
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Failed to connect');
    }
    setConnecting(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setError('');
    setMessage('');
    try {
      const result = await testConnection({
        host: form.host,
        port: parseInt(form.port),
        database: form.database,
        user: form.user,
        password: form.password,
        ssl: form.ssl,
      });
      if (result.success && result.data?.connected) {
        setMessage('Connection successful!');
      } else {
        setError('Connection test failed. Check your credentials.');
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Test failed');
    }
    setTesting(false);
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    try {
      const result = await connectDatabase({
        host: form.host,
        port: parseInt(form.port),
        database: form.database,
        user: form.user,
        password: form.password,
        ssl: form.ssl,
      });
      if (result.success && result.data) {
        setConnection(true, 'custom', result.data.database);
        setMessage('Connected!');
        setShowForm(false);
      } else {
        setError(result.error || 'Connection failed');
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Failed to connect');
    }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch { /* ignore */ }
    setConnection(false);
    setMessage('');
  };

  return (
    <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
      <div className="card-header">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={18} className="text-accent-primary" /> Database Connection
        </span>
        {isConnected && (
          <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>Disconnect</button>
        )}
      </div>

      {!isConnected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <button className="btn btn-primary" onClick={handleConnectDemo} disabled={connecting}>
              {connecting ? '…' : '⚡ Connect Demo Database'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '🔧 Custom Connection'}
            </button>
          </div>

          {showForm && (
            <div className="connection-form" style={{ marginTop: 'var(--space-md)' }}>
              <div className="input-group">
                <label className="input-label">Host</label>
                <input className="input" value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="localhost" />
              </div>
              <div className="input-group">
                <label className="input-label">Port</label>
                <input className="input" value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })} placeholder="5432" />
              </div>
              <div className="input-group">
                <label className="input-label">Database</label>
                <input className="input" value={form.database}
                  onChange={(e) => setForm({ ...form, database: e.target.value })} placeholder="mydb" />
              </div>
              <div className="input-group">
                <label className="input-label">Username</label>
                <input className="input" value={form.user}
                  onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="postgres" />
              </div>
              <div className="input-group full-width">
                <label className="input-label">Password</label>
                <input className="input" type="password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="full-width" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="ssl-check" checked={form.ssl}
                  onChange={(e) => setForm({ ...form, ssl: e.target.checked })} />
                <label htmlFor="ssl-check" className="input-label" style={{ margin: 0 }}>Use SSL</label>
              </div>
              <div className="full-width" style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button className="btn btn-secondary" onClick={handleTest} disabled={testing || !form.host || !form.database}>
                  {testing ? 'Testing…' : 'Test Connection'}
                </button>
                <button className="btn btn-primary" onClick={handleConnect}
                  disabled={connecting || !form.host || !form.database || !form.user}>
                  {connecting ? 'Connecting…' : 'Connect'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="connection-dot" />
          {connectionType === 'demo' ? 'Demo E-commerce Database' : 'Custom Database'}
        </div>
      )}

      {message && <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--accent-success)' }}>{message}</p>}
      {error && <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--accent-danger)' }}>{error}</p>}
    </div>
  );
}
