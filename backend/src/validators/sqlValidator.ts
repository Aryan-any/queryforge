import { config } from '../config';
import logger from '../utils/logger';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * SQL Validator
 * 
 * Enforces read-only query safety:
 *   - Blocks destructive statements (DROP, DELETE, TRUNCATE, etc.)
 *   - Ensures SELECT-only queries
 *   - Auto-appends LIMIT when missing
 */
export class SQLValidator {
  // Destructive SQL keywords that must never appear
  private readonly BLOCKED_KEYWORDS = [
    'DROP', 'DELETE', 'TRUNCATE', 'UPDATE', 'ALTER', 'INSERT',
    'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL',
    'COPY', 'VACUUM', 'REINDEX', 'CLUSTER',
  ];

  // Patterns to detect blocked keywords (word boundary match)
  private readonly BLOCKED_PATTERNS: RegExp[];

  constructor() {
    this.BLOCKED_PATTERNS = this.BLOCKED_KEYWORDS.map(
      keyword => new RegExp(`\\b${keyword}\\b`, 'i')
    );
  }

  /**
   * Validate a SQL query for safety.
   */
  validate(sql: string): ValidationResult {
    const errors: string[] = [];
    const trimmed = sql.trim();

    // Must not be empty
    if (!trimmed) {
      errors.push('SQL query is empty');
      return { isValid: false, errors };
    }

    // Remove comments for analysis
    const cleaned = this.removeComments(trimmed);

    // Must start with SELECT or WITH (CTE)
    if (!this.isSelectQuery(cleaned)) {
      errors.push('Only SELECT queries are allowed. Query must start with SELECT or WITH.');
    }

    // Check for blocked keywords
    for (let i = 0; i < this.BLOCKED_KEYWORDS.length; i++) {
      if (this.BLOCKED_PATTERNS[i].test(cleaned)) {
        errors.push(`Prohibited keyword detected: ${this.BLOCKED_KEYWORDS[i]}`);
      }
    }

    // Check for multiple statements (semicolons in the middle)
    const statementsCheck = cleaned.replace(/;+\s*$/, ''); // Remove trailing semicolons
    if (statementsCheck.includes(';')) {
      errors.push('Multiple SQL statements are not allowed');
    }

    if (errors.length > 0) {
      logger.warn('SQL validation failed', { sql: trimmed.substring(0, 200), errors });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Apply safety transformations to a validated query.
   */
  applySafetyTransforms(sql: string): string {
    let result = sql.trim();

    // Remove trailing semicolons
    result = result.replace(/;+\s*$/, '');

    // Add LIMIT if not present and not an aggregate-only query
    if (!this.hasLimit(result) && !this.isAggregateOnly(result)) {
      result += ` LIMIT ${config.query.defaultLimit}`;
    }

    return result;
  }

  /**
   * Check if the query starts with SELECT or WITH.
   */
  private isSelectQuery(sql: string): boolean {
    const upper = sql.trimStart().toUpperCase();
    return upper.startsWith('SELECT') || upper.startsWith('WITH');
  }

  /**
   * Check if query already has a LIMIT clause.
   */
  private hasLimit(sql: string): boolean {
    return /\bLIMIT\s+\d+/i.test(sql);
  }

  /**
   * Check if query is aggregate-only (COUNT, SUM, etc. without GROUP BY).
   * These queries return a single row, so LIMIT is unnecessary.
   */
  private isAggregateOnly(sql: string): boolean {
    const upper = sql.toUpperCase();
    const hasAggregate = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(upper);
    const hasGroupBy = /\bGROUP\s+BY\b/i.test(upper);
    
    // If it has aggregates but no GROUP BY, it returns one row
    return hasAggregate && !hasGroupBy;
  }

  /**
   * Remove SQL comments for clean analysis.
   */
  private removeComments(sql: string): string {
    // Remove single-line comments
    let result = sql.replace(/--.*$/gm, '');
    // Remove multi-line comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    return result.trim();
  }
}

export const sqlValidator = new SQLValidator();
