import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { BarChart3, LineChart as LucideLineChart, PieChart as LucidePieChart, ScatterChart as LucideScatterChart, TableProperties } from 'lucide-react';
import ResultsTable from '../Query/ResultsTable';
import { useAppStore } from '../../stores/appStore';
import type { QueryResult, ChartType } from '../../utils/types';

interface ChartRendererProps {
  result: QueryResult;
  height?: number;
  showToolbar?: boolean;
}

const CHART_COLORS = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
];

export default function ChartRenderer({ result, height = 350, showToolbar = true }: ChartRendererProps) {
  const { selectedChartType, setSelectedChartType } = useAppStore();
  const chartType: ChartType = selectedChartType || result.visualization.chartType;

  const chartTypes: Array<{ type: ChartType; label: string; icon: React.ReactNode }> = [
    { type: 'bar', label: 'Bar', icon: <BarChart3 size={16} /> },
    { type: 'line', label: 'Line', icon: <LucideLineChart size={16} /> },
    { type: 'pie', label: 'Pie', icon: <LucidePieChart size={16} /> },
    { type: 'scatter', label: 'Scatter', icon: <LucideScatterChart size={16} /> },
    { type: 'table', label: 'Table', icon: <TableProperties size={16} /> },
  ];

  // Determine axes
  const xAxis = result.visualization.xAxis || result.columns[0]?.name;
  const yAxis = result.visualization.yAxis || result.columns[1]?.name;

  // Prepare chart data (ensure numeric values)
  const chartData = result.rows.map(row => {
    const entry: Record<string, unknown> = {};
    for (const col of result.columns) {
      const val = row[col.name];
      // Parse numeric strings for chart consumption
      if (typeof val === 'string' && !isNaN(Number(val))) {
        entry[col.name] = Number(val);
      } else {
        entry[col.name] = val;
      }
    }
    return entry;
  });

  return (
    <div className="chart-container">
      {showToolbar && (
        <div className="chart-toolbar">
          {chartTypes.map(ct => (
            <button
              key={ct.type}
              className={`chart-type-btn${chartType === ct.type ? ' active' : ''}`}
              onClick={() => setSelectedChartType(ct.type)}
            >
              {ct.icon} {ct.label}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {result.visualization.reason}
          </span>
        </div>
      )}

      {chartType === 'table' ? (
        <ResultsTable result={result} />
      ) : chartType === 'bar' ? (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData} margin={{ bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey={xAxis} tick={{ fill: '#94a3b8', fontSize: 11, angle: -45, textAnchor: 'end' }} height={60} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#1e2642', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', color: '#f1f5f9' }}
            />
            <Legend />
            {result.columns
              .filter(c => c.name !== xAxis)
              .slice(0, 5)
              .map((col, i) => (
                <Bar key={col.name} dataKey={col.name} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
          </BarChart>
        </ResponsiveContainer>
      ) : chartType === 'line' ? (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey={xAxis} tick={{ fill: '#94a3b8', fontSize: 11, angle: -45, textAnchor: 'end' }} height={60} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#1e2642', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', color: '#f1f5f9' }}
            />
            <Legend />
            {result.columns
              .filter(c => c.name !== xAxis)
              .slice(0, 5)
              .map((col, i) => (
                <Line
                  key={col.name}
                  type="monotone"
                  dataKey={col.name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                  activeDot={{ r: 5 }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      ) : chartType === 'pie' ? (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey={yAxis || result.columns[1]?.name}
              nameKey={xAxis}
              cx="50%" cy="50%"
              outerRadius={height / 3}
              label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#94a3b8' }}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1e2642', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', color: '#f1f5f9' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : chartType === 'scatter' ? (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart margin={{ bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey={xAxis} name={xAxis} tick={{ fill: '#94a3b8', fontSize: 11, angle: -45, textAnchor: 'end' }} height={60} />
            <YAxis dataKey={yAxis} name={yAxis} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#1e2642', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', color: '#f1f5f9' }}
            />
            <Scatter data={chartData} fill="#6366f1">
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      ) : (
        <ResultsTable result={result} />
      )}
    </div>
  );
}
