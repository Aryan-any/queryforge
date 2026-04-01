import api from './api';
import type { ApiResponse, SchemaInfo } from '../utils/types';

export async function getSchema(): Promise<ApiResponse<SchemaInfo>> {
  const res = await api.get('/api/schema');
  return res.data;
}

export async function getSchemaSummary(): Promise<ApiResponse<{ summary: string }>> {
  const res = await api.get('/api/schema/summary');
  return res.data;
}

export async function clearSchemaCache(): Promise<ApiResponse> {
  const res = await api.delete('/api/schema/cache');
  return res.data;
}
