import { useState, type FormEvent } from 'react';
import { login } from '../../services/authService';
import { useAppStore } from '../../stores/appStore';
import { Zap } from 'lucide-react';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAppStore((s) => s.setAuth);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        setAuth(true, username);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
             <Zap size={32} fill="white" stroke="white" />
          </div>
          <h1 className="login-title">QueryForge</h1>
          <p className="login-subtitle">Conversational Business Intelligence</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="login-username">Username</label>
            <input
              id="login-username"
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || !username || !password}
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <>
                <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Demo credentials: <code style={{ color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)' }}>admin / queryforge2024</code>
          </p>
        </div>
      </div>
    </div>
  );
}
