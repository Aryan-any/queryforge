import api from './api';
import type { ApiResponse, Dashboard, DashboardWidget, ChartType, WidgetConfig, WidgetPosition } from '../utils/types';

export async function listDashboards(): Promise<ApiResponse<Dashboard[]>> {
  const res = await api.get('/api/dashboards');
  return res.data;
}

export async function getDashboard(id: string): Promise<ApiResponse<Dashboard>> {
  const res = await api.get(`/api/dashboards/${id}`);
  return res.data;
}

export async function createDashboard(name: string, description?: string): Promise<ApiResponse<Dashboard>> {
  const res = await api.post('/api/dashboards', { name, description });
  return res.data;
}

export async function updateDashboard(id: string, name: string, description?: string): Promise<ApiResponse<Dashboard>> {
  const res = await api.put(`/api/dashboards/${id}`, { name, description });
  return res.data;
}

export async function deleteDashboard(id: string): Promise<ApiResponse> {
  const res = await api.delete(`/api/dashboards/${id}`);
  return res.data;
}

export async function addWidget(
  dashboardId: string,
  widget: { title: string; query: string; sql: string; chartType: ChartType; config?: WidgetConfig; position?: WidgetPosition }
): Promise<ApiResponse<DashboardWidget>> {
  const res = await api.post(`/api/dashboards/${dashboardId}/widgets`, widget);
  return res.data;
}

export async function updateWidget(
  dashboardId: string,
  widgetId: string,
  updates: Partial<{ title: string; chartType: ChartType; config: WidgetConfig; position: WidgetPosition }>
): Promise<ApiResponse<DashboardWidget>> {
  const res = await api.put(`/api/dashboards/${dashboardId}/widgets/${widgetId}`, updates);
  return res.data;
}

export async function deleteWidget(dashboardId: string, widgetId: string): Promise<ApiResponse> {
  const res = await api.delete(`/api/dashboards/${dashboardId}/widgets/${widgetId}`);
  return res.data;
}
