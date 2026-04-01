import api from './api';
import type { ApiResponse, ConnectionConfig } from '../utils/types';

export async function testConnection(config: ConnectionConfig): Promise<ApiResponse<{ connected: boolean }>> {
  const res = await api.post('/api/connections/test', config);
  return res.data;
}

export async function connectDatabase(config: ConnectionConfig): Promise<ApiResponse<{ connectionId: string; database: string }>> {
  const res = await api.post('/api/connections/connect', config);
  return res.data;
}

export async function connectDemo(): Promise<ApiResponse<{ connectionId: string; database: string }>> {
  const res = await api.post('/api/connections/demo');
  return res.data;
}

export async function disconnect(): Promise<ApiResponse> {
  const res = await api.post('/api/connections/disconnect');
  return res.data;
}
