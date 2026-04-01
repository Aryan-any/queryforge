import { useState, useEffect, useCallback } from 'react';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import { Link, LayoutDashboard } from 'lucide-react';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useAppStore } from '../../stores/appStore';
import * as dashService from '../../services/dashboardService';
import { executeSQL } from '../../services/queryService';
import ChartRenderer from '../Charts/ChartRenderer';
import type { QueryResult } from '../../utils/types';

export default function DashboardBuilder() {
  const {
    dashboards, setDashboards,
    activeDashboard, setActiveDashboard,
    isConnected, currentResult,
  } = useAppStore();

  const { width: containerWidth, containerRef: gridContainerRef } = useContainerWidth();

  const [loading, setLoading] = useState(false);
  const [widgetData, setWidgetData] = useState<Record<string, QueryResult>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDashName, setNewDashName] = useState('');
  const [showSaveWidget, setShowSaveWidget] = useState(false);
  const [widgetTitle, setWidgetTitle] = useState('');

  // Load dashboards
  const loadDashboards = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const result = await dashService.listDashboards();
      if (result.success && result.data) {
        setDashboards(result.data);
      }
    } catch (err) {
      console.error('Failed to load dashboards:', err);
    }
    setLoading(false);
  }, [isConnected, setDashboards]);

  useEffect(() => {
    loadDashboards();
  }, [loadDashboards]);

  // Load a dashboard
  const loadDashboard = async (id: string) => {
    try {
      const result = await dashService.getDashboard(id);
      if (result.success && result.data) {
        setActiveDashboard(result.data);
        // Execute all widgets' SQL concurrently
        await Promise.allSettled(
          result.data.widgets.map(async (widget) => {
            try {
              const queryResult = await executeSQL(widget.sql);
              if (queryResult.success && queryResult.data) {
                setWidgetData(prev => ({ ...prev, [widget.id]: queryResult.data! }));
              }
            } catch (err) {
              console.error(`Failed to execute widget ${widget.id}`, err);
            }
          })
        );
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  };

  // Create dashboard
  const handleCreate = async () => {
    if (!newDashName.trim()) return;
    try {
      const result = await dashService.createDashboard(newDashName.trim());
      if (result.success && result.data) {
        setDashboards([result.data, ...dashboards]);
        setActiveDashboard(result.data);
        setShowCreateModal(false);
        setNewDashName('');
      }
    } catch (err) {
      console.error('Create failed:', err);
    }
  };

  // Delete dashboard
  const handleDelete = async (id: string) => {
    try {
      await dashService.deleteDashboard(id);
      setDashboards(dashboards.filter(d => d.id !== id));
      if (activeDashboard?.id === id) setActiveDashboard(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Save current query as widget
  const handleSaveWidget = async () => {
    if (!activeDashboard || !currentResult || !widgetTitle.trim()) return;
    try {
      const result = await dashService.addWidget(activeDashboard.id, {
        title: widgetTitle.trim(),
        query: currentResult.question || '',
        sql: currentResult.sql,
        chartType: currentResult.visualization.chartType,
        config: {
          xAxis: currentResult.visualization.xAxis,
          yAxis: currentResult.visualization.yAxis,
        },
      });
      if (result.success && result.data) {
        const updated = { ...activeDashboard, widgets: [...activeDashboard.widgets, result.data] };
        setActiveDashboard(updated);
        setWidgetData(prev => ({ ...prev, [result.data!.id]: currentResult }));
        setShowSaveWidget(false);
        setWidgetTitle('');
      }
    } catch (err) {
      console.error('Save widget failed:', err);
    }
  };

  // Delete widget
  const handleDeleteWidget = async (widgetId: string) => {
    if (!activeDashboard) return;
    try {
      await dashService.deleteWidget(activeDashboard.id, widgetId);
      const updated = {
        ...activeDashboard,
        widgets: activeDashboard.widgets.filter(w => w.id !== widgetId),
      };
      setActiveDashboard(updated);
    } catch (err) {
      console.error('Delete widget failed:', err);
    }
  };

  // Layout change
  const handleLayoutChange = async (layout: ReadonlyArray<{ i: string; x: number; y: number; w: number; h: number }>) => {
    if (!activeDashboard) return;
    for (const item of layout) {
      const widget = activeDashboard.widgets.find(w => w.id === item.i);
      if (widget) {
        try {
          await dashService.updateWidget(activeDashboard.id, widget.id, {
            position: { x: item.x, y: item.y, w: item.w, h: item.h },
          });
        } catch { /* skip */ }
      }
    }
  };

  if (!isConnected) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">Connect to a Database</div>
        <div className="empty-state-description">Connect to a database to create and view dashboards.</div>
      </div>
    );
  }

  // Dashboard list view
  if (!activeDashboard) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Your Dashboards</h3>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + New Dashboard
          </button>
        </div>

        {loading ? (
          <div className="loading-container"><div className="loading-spinner" /><div className="loading-text">Loading dashboards…</div></div>
        ) : dashboards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-title">No dashboards yet</div>
            <div className="empty-state-description">Create a dashboard and save query results as interactive widgets.</div>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Create Dashboard</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
            {dashboards.map(dash => (
              <div key={dash.id} className="card" style={{ cursor: 'pointer' }} onClick={() => loadDashboard(dash.id)}>
                <div className="card-header">
                  <span className="card-title">{dash.name}</span>
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(dash.id); }}>🗑️</button>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {dash.description || 'No description'}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Updated {new Date(dash.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">New Dashboard</span>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateModal(false)}>✕</button>
              </div>
              <div className="input-group">
                <label className="input-label">Dashboard Name</label>
                <input className="input" value={newDashName} onChange={(e) => setNewDashName(e.target.value)}
                  placeholder="e.g. Sales Overview" autoFocus />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={!newDashName.trim()}>Create</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Copy share link
  const handleShare = () => {
    if (!activeDashboard?.shareToken) {
      alert('Share token not found for this dashboard.');
      return;
    }
    const url = `${import.meta.env.VITE_APP_URL || window.location.origin}/share/${activeDashboard.shareToken}`;
    navigator.clipboard.writeText(url)
      .then(() => alert('Share link copied to clipboard!'))
      .catch(() => alert('Failed to copy share link.'));
  };

  // Active dashboard view
  const layoutItems = activeDashboard.widgets.map(w => ({
    i: w.id,
    x: w.position.x,
    y: w.position.y,
    w: w.position.w,
    h: w.position.h,
    minW: 3,
    minH: 3,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveDashboard(null)}>← Back</button>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{activeDashboard.name}</h3>
          <span className="badge badge-primary">{activeDashboard.widgets.length} widgets</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeDashboard.shareToken && (
            <button className="btn btn-secondary btn-sm" onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Link size={14} /> Share Link
            </button>
          )}
          {currentResult && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowSaveWidget(true)}>
              + Add Current Query
            </button>
          )}
        </div>
      </div>

      {activeDashboard.widgets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ color: 'var(--border-accent)' }}>
            <LayoutDashboard size={48} strokeWidth={1.5} />
          </div>
          <div className="empty-state-title">Empty Dashboard</div>
          <div className="empty-state-description">
            Run a query in the Query tab, then come back here to add it as a widget.
          </div>
        </div>
      ) : (
        <div ref={gridContainerRef}>
        <Responsive
          className="dashboard-grid"
          width={containerWidth || 1200}
          layouts={{ lg: layoutItems }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          onLayoutChange={handleLayoutChange}
        >
          {activeDashboard.widgets.map(widget => (
            <div key={widget.id} className="widget-card">
              <div className="widget-header">
                <span className="widget-title">{widget.title}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteWidget(widget.id)} style={{ padding: '2px 6px' }}>✕</button>
              </div>
              <div className="widget-body">
                {widgetData[widget.id] ? (
                  <ChartRenderer result={{ ...widgetData[widget.id], visualization: { ...widgetData[widget.id].visualization, chartType: widget.chartType } }} height={250} showToolbar={false} />
                ) : (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                )}
              </div>
            </div>
          ))}
        </Responsive>
        </div>
      )}

      {/* Save Widget Modal */}
      {showSaveWidget && (
        <div className="modal-overlay" onClick={() => setShowSaveWidget(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Widget</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowSaveWidget(false)}>✕</button>
            </div>
            <div className="input-group">
              <label className="input-label">Widget Title</label>
              <input className="input" value={widgetTitle} onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="e.g. Top Products by Revenue" autoFocus />
            </div>
            {currentResult && (
              <div className="sql-display" style={{ marginTop: '12px', maxHeight: '100px', overflow: 'auto' }}>
                {currentResult.sql}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setShowSaveWidget(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveWidget} disabled={!widgetTitle.trim()}>Save Widget</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
