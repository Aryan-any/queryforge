import { create } from 'zustand';
import type { SchemaInfo, QueryResult, ConversationEntry, Dashboard, ChartType } from '../utils/types';

interface AppState {
  // Auth
  isAuthenticated: boolean;
  username: string | null;
  setAuth: (authenticated: boolean, username?: string) => void;

  // Connection
  isConnected: boolean;
  connectionType: 'demo' | 'custom' | null;
  connectionDatabase: string | null;
  setConnection: (connected: boolean, type?: 'demo' | 'custom', database?: string) => void;

  // API Key (stored in memory, persisted in localStorage by component)
  apiKey: string;
  llmProvider: string;
  setApiKey: (key: string) => void;
  setLLMProvider: (provider: string) => void;

  // Schema
  schema: SchemaInfo | null;
  schemaLoading: boolean;
  setSchema: (schema: SchemaInfo | null) => void;
  setSchemaLoading: (loading: boolean) => void;

  // Query
  currentResult: QueryResult | null;
  queryLoading: boolean;
  queryError: string | null;
  conversationHistory: ConversationEntry[];
  queryHistory: Array<{ question: string; sql: string; timestamp: string }>;
  selectedChartType: ChartType | null;
  setCurrentResult: (result: QueryResult | null) => void;
  setQueryLoading: (loading: boolean) => void;
  setQueryError: (error: string | null) => void;
  addConversationEntry: (entry: ConversationEntry) => void;
  clearConversation: () => void;
  addQueryHistory: (question: string, sql: string) => void;
  setSelectedChartType: (type: ChartType | null) => void;

  // Dashboard
  dashboards: Dashboard[];
  activeDashboard: Dashboard | null;
  setDashboards: (dashboards: Dashboard[]) => void;
  setActiveDashboard: (dashboard: Dashboard | null) => void;

  // UI
  sidebarOpen: boolean;
  activeTab: 'query' | 'schema' | 'dashboard';
  toggleSidebar: () => void;
  setActiveTab: (tab: 'query' | 'schema' | 'dashboard') => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  isAuthenticated: false,
  username: null,
  setAuth: (authenticated, username) =>
    set({ isAuthenticated: authenticated, username: username || null }),

  // Connection
  isConnected: false,
  connectionType: null,
  connectionDatabase: null,
  setConnection: (connected, type, database) =>
    set({
      isConnected: connected,
      connectionType: type || null,
      connectionDatabase: database || null,
    }),

  // API Key
  apiKey: localStorage.getItem('qf_api_key') || '',
  llmProvider: localStorage.getItem('qf_llm_provider') || 'openai',
  setApiKey: (key) => {
    localStorage.setItem('qf_api_key', key);
    set({ apiKey: key });
  },
  setLLMProvider: (provider) => {
    localStorage.setItem('qf_llm_provider', provider);
    set({ llmProvider: provider });
  },

  // Schema
  schema: null,
  schemaLoading: false,
  setSchema: (schema) => set({ schema }),
  setSchemaLoading: (loading) => set({ schemaLoading: loading }),

  // Query
  currentResult: null,
  queryLoading: false,
  queryError: null,
  conversationHistory: [],
  queryHistory: [],
  selectedChartType: null,
  setCurrentResult: (result) => set({ currentResult: result }),
  setQueryLoading: (loading) => set({ queryLoading: loading }),
  setQueryError: (error) => set({ queryError: error }),
  addConversationEntry: (entry) =>
    set((state) => ({
      conversationHistory: [...state.conversationHistory, entry],
    })),
  clearConversation: () => set({ conversationHistory: [] }),
  addQueryHistory: (question, sql) =>
    set((state) => ({
      queryHistory: [
        { question, sql, timestamp: new Date().toISOString() },
        ...state.queryHistory,
      ].slice(0, 50), // Keep last 50
    })),
  setSelectedChartType: (type) => set({ selectedChartType: type }),

  // Dashboard
  dashboards: [],
  activeDashboard: null,
  setDashboards: (dashboards) => set({ dashboards }),
  setActiveDashboard: (dashboard) => set({ activeDashboard: dashboard }),

  // UI
  sidebarOpen: true,
  activeTab: 'query',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
