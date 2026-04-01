import api from './api';
import type { ApiResponse, QueryResult, ConversationEntry } from '../utils/types';

export async function executeQuery(
  question: string,
  apiKey: string,
  conversationHistory: ConversationEntry[] = [],
  provider: string = 'openai'
): Promise<ApiResponse<QueryResult>> {
  const res = await api.post('/api/query', {
    question,
    apiKey,
    conversationHistory,
    provider,
  });
  return res.data;
}

export async function executeSQL(sql: string): Promise<ApiResponse<QueryResult>> {
  const res = await api.post('/api/query/sql', { sql });
  return res.data;
}
