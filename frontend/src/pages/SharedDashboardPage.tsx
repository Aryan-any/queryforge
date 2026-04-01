import { useEffect, useState } from 'react';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import { Zap, LayoutDashboard } from 'lucide-react';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import ChartRenderer from '../components/Charts/ChartRenderer';
import type { Dashboard, QueryResult } from '../utils/types';

interface PopulatedWidget extends Omit<Dashboard['widgets'][0], 'data'> {
  data?: QueryResult;
  error?: string;
}

export default function SharedDashboardPage({ token }: { token: string }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStr, setErrorStr] = useState<string | null>(null);

  const { width: containerWidth, containerRef } = useContainerWidth();

  useEffect(() => {
    const fetchSharedDash = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/dashboards/shared/${token}`);
        const data = await res.json();
        
        if (data.success && data.data) {
          setDashboard(data.data);
        } else {
          setErrorStr(data.error || 'Failed to load shared dashboard.');
        }
      } catch (err) {
        setErrorStr('Connection error. Could not load dashboard.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSharedDash();
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  if (errorStr || !dashboard) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column' }}>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Dashboard Not Found</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{errorStr || 'The link may be invalid or expired.'}</p>
      </div>
    );
  }

  const layout = dashboard.widgets.map((w) => ({
    i: w.id,
    x: w.position?.x || 0,
    y: w.position?.y || 0,
    w: w.position?.w || 6,
    h: w.position?.h || 4,
    static: true // Make all read-only
  }));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '1.5rem 2rem', 
        borderBottom: '1px solid var(--border-color)', 
        background: 'var(--bg-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>
            {dashboard.name}
          </h1>
          {dashboard.description && (
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{dashboard.description}</p>
          )}
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          Read-only Shared View
        </div>
      </header>

      <main style={{ padding: '2rem', flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%' }} ref={containerRef}>
        {dashboard.widgets.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ color: 'var(--border-accent)', marginBottom: '8px' }}>
              <LayoutDashboard size={48} strokeWidth={1.5} />
            </div>
            This dashboard is empty.
          </div>
        ) : (
          <Responsive
            className="layout"
            layouts={{ lg: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={100}
            containerPadding={[0, 0]}
            width={containerWidth || 1200}
            {...{ isDraggable: false, isResizable: false } as any}
          >
            {dashboard.widgets.map((widgetRaw) => {
              const widget = widgetRaw as PopulatedWidget;
              return (
                <div key={widget.id} className="widget-card">
                  <div className="widget-header">
                    <h4>{widget.title}</h4>
                  </div>
                  <div className="widget-content">
                    {widget.error ? (
                      <div className="widget-error">Error loading data: {widget.error}</div>
                    ) : widget.data ? (
                      <ChartRenderer
                        result={{ ...widget.data, visualization: { ...widget.data.visualization, chartType: widget.chartType } }}
                        height={250}
                        showToolbar={false}
                      />
                    ) : (
                      <div className="loading-spinner" />
                    )}
                  </div>
                </div>
              );
            })}
          </Responsive>
        )}
      </main>

      {/* Powered by Final Footer */}
      <footer style={{
        marginTop: 'auto',
        padding: '1.5rem',
        textAlign: 'center',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '6px'
      }}>
        <Zap size={14} fill="var(--text-muted)" />
        Powered by <strong style={{ color: 'var(--text-secondary)' }}>QueryForge</strong> Analytics
      </footer>
    </div>
  );
}
