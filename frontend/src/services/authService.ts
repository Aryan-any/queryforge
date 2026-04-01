import api from './api';
import type { ApiResponse } from '../utils/types';

export async function login(username: string, password: string): Promise<ApiResponse> {
  const res = await api.post('/api/auth/login', { username, password });
  return res.data;
}

export async function logout(): Promise<ApiResponse> {
  const res = await api.post('/api/auth/logout');
  return res.data;
}

export async function checkSession(): Promise<ApiResponse<{ authenticated: boolean; username?: string; hasConnection?: boolean; connectionType?: string }>> {
  const res = await api.get('/api/auth/session');
  return res.data;
}
