import { ColumnMeta, ChartType, VisualizationRecommendation } from '../utils/types';

/**
 * Visualization Recommendation Engine
 * 
 * Automatically determines the best chart type based on
 * query result column types and counts.
 * 
 * Heuristics:
 *   - time series column present → line chart
 *   - category + metric → bar chart
 *   - proportions (few categories, one metric) → pie chart
 *   - two numeric columns → scatter plot
 *   - default → table
 */
export class VisualizationService {
  private readonly TIME_TYPES = ['date', 'timestamp', 'timestamptz'];
  private readonly NUMERIC_TYPES = ['integer', 'bigint', 'smallint', 'float4', 'float8', 'numeric'];
  private readonly STRING_TYPES = ['text', 'varchar', 'char'];

  /**
   * Recommend the best chart type for given result columns and data.
   */
  recommend(columns: ColumnMeta[], rows: Record<string, unknown>[]): VisualizationRecommendation {
    if (columns.length === 0 || rows.length === 0) {
      return { chartType: 'table', reason: 'No data to visualize' };
    }

    // Classify columns
    const timeColumns = columns.filter(c => this.TIME_TYPES.includes(c.dataType));
    const numericColumns = columns.filter(c => this.NUMERIC_TYPES.includes(c.dataType));
    const stringColumns = columns.filter(c => this.STRING_TYPES.includes(c.dataType));

    // Single value result → table
    if (rows.length === 1 && columns.length === 1) {
      return { chartType: 'table', reason: 'Single value result' };
    }

    // Time series: has a time column and at least one numeric column
    if (timeColumns.length > 0 && numericColumns.length > 0) {
      return {
        chartType: 'line',
        xAxis: timeColumns[0].name,
        yAxis: numericColumns[0].name,
        reason: 'Time series data detected — line chart shows trends over time',
      };
    }

    // Pie chart: one string column + one numeric column with few rows
    if (stringColumns.length === 1 && numericColumns.length === 1 && rows.length <= 10) {
      return {
        chartType: 'pie',
        xAxis: stringColumns[0].name,
        yAxis: numericColumns[0].name,
        reason: 'Category with proportions — pie chart shows distribution',
      };
    }

    // Bar chart: string column + numeric column
    if (stringColumns.length >= 1 && numericColumns.length >= 1) {
      return {
        chartType: 'bar',
        xAxis: stringColumns[0].name,
        yAxis: numericColumns[0].name,
        reason: 'Category vs metric comparison — bar chart for comparison',
      };
    }

    // Scatter plot: two numeric columns
    if (numericColumns.length >= 2 && stringColumns.length === 0) {
      return {
        chartType: 'scatter',
        xAxis: numericColumns[0].name,
        yAxis: numericColumns[1].name,
        reason: 'Two numeric variables — scatter plot shows correlation',
      };
    }

    // Default to table
    return {
      chartType: 'table',
      reason: 'Multi-column result — table provides full data view',
    };
  }

  /**
   * Get all available chart types for user selection.
   */
  getAvailableChartTypes(): ChartType[] {
    return ['bar', 'line', 'pie', 'scatter', 'table'];
  }
}

export const visualizationService = new VisualizationService();
