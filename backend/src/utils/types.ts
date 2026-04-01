// ─── Database Types ──────────────────────────────────────────────────────────

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string | null;
  characterMaxLength: number | null;
  sampleValues?: string[];
}

export interface ForeignKey {
  constraintName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  foreignKeys: ForeignKey[];
  indexes: IndexInfo[];
  rowCount: number;
}

export interface SchemaInfo {
  tables: TableInfo[];
  relationships: Relationship[];
  generatedAt: string;
}

export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-many' | 'many-to-one' | 'one-to-one';
}

// ─── Query Types ─────────────────────────────────────────────────────────────

export interface QueryRequest {
  question: string;
  conversationHistory?: ConversationEntry[];
  apiKey: string;
  provider?: LLMProviderType;
}

export interface ConversationEntry {
  role: 'user' | 'assistant';
  question?: string;
  sql?: string;
  summary?: string;
}

export interface QueryResult {
  sql: string;
  rows: Record<string, unknown>[];
  columns: ColumnMeta[];
  rowCount: number;
  executionTimeMs: number;
  visualization: VisualizationRecommendation;
}

export interface ColumnMeta {
  name: string;
  dataType: string;
}

// ─── Visualization Types ─────────────────────────────────────────────────────

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'table';

export interface VisualizationRecommendation {
  chartType: ChartType;
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  reason: string;
}

// ─── Dashboard Types ─────────────────────────────────────────────────────────

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
  widgets: DashboardWidget[];
}

export interface DashboardWidget {
  id: string;
  dashboardId: string;
  title: string;
  query: string;
  sql: string;
  chartType: ChartType;
  config: WidgetConfig;
  position: WidgetPosition;
  cachedData?: Record<string, unknown>[];
  createdAt: string;
}

export interface WidgetConfig {
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  colors?: string[];
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── LLM Types ───────────────────────────────────────────────────────────────

export type LLMProviderType = 'openai' | 'claude' | 'gemini';

export interface LLMGenerationResult {
  sql: string;
  provider: LLMProviderType;
  model: string;
  tokensUsed?: number;
}

// ─── Auth Types ──────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SessionData {
  userId: string;
  username: string;
  activeConnection?: ConnectionConfig | 'demo';
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Extend express-session
declare module 'express-session' {
  interface SessionData {
    user?: {
      userId: string;
      username: string;
    };
    activeConnection?: ConnectionConfig | 'demo';
    connectionId?: string;
  }
}
