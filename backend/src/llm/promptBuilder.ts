import { ConversationEntry } from '../utils/types';

/**
 * Prompt Builder
 * 
 * Constructs structured prompts for LLM SQL generation with
 * schema context, safety rules, and conversation history.
 */
export class PromptBuilder {
  /**
   * Build the system prompt that sets up SQL generation rules.
   */
  buildSystemPrompt(): string {
    return `You are an expert SQL query generator for PostgreSQL databases.

RULES:
1. Generate ONLY valid PostgreSQL SQL queries
2. Return ONLY the raw SQL query. DO NOT wrap it in markdown backticks. DO NOT prefix it with "sql". Start immediately with SELECT.
3. NEVER use DROP, DELETE, TRUNCATE, UPDATE, ALTER, INSERT, CREATE, or GRANT
4. Only generate SELECT queries
5. Always include appropriate JOIN conditions when querying multiple tables
6. Use table aliases for readability
7. Add LIMIT clause if the user doesn't specify one (default LIMIT 100)
8. Use proper date/time functions for temporal queries (e.g., NOW(), INTERVAL)
9. Handle NULL values appropriately
10. Use aggregate functions (SUM, COUNT, AVG, etc.) when the question implies aggregation
11. Use ORDER BY when ranking or sorting is implied
12. Use GROUP BY when aggregation is needed
13. Prefer explicit column names over SELECT *
14. Use proper string matching (ILIKE for case-insensitive)

IMPORTANT: Your output must be a single SQL query and nothing else.`;
  }

  /**
   * Build the user prompt with schema context and question.
   */
  buildUserPrompt(
    question: string,
    schemaSummary: string,
    conversationHistory: ConversationEntry[] = []
  ): string {
    const parts: string[] = [];

    // Schema context
    parts.push('DATABASE SCHEMA:');
    parts.push(schemaSummary);
    parts.push('');

    // Conversation history for follow-up context
    if (conversationHistory.length > 0) {
      parts.push('CONVERSATION HISTORY:');
      for (const entry of conversationHistory.slice(-5)) { // Last 5 exchanges
        if (entry.role === 'user' && entry.question) {
          parts.push(`User: ${entry.question}`);
        }
        if (entry.role === 'assistant' && entry.sql) {
          parts.push(`Generated SQL: ${entry.sql}`);
        }
      }
      parts.push('');
    }

    // Current question
    parts.push(`USER QUESTION: ${question}`);
    parts.push('');
    parts.push('Generate the PostgreSQL SQL query:');

    return parts.join('\n');
  }

  /**
   * Build a fallback prompt with simpler instructions (used on retry).
   */
  buildFallbackPrompt(
    question: string,
    schemaSummary: string,
    previousError?: string
  ): string {
    const parts: string[] = [];
    
    parts.push('DATABASE SCHEMA:');
    parts.push(schemaSummary);
    parts.push('');
    
    if (previousError) {
      parts.push(`PREVIOUS ATTEMPT FAILED WITH ERROR: ${previousError}`);
      parts.push('Please fix the SQL query based on this error.');
      parts.push('');
    }
    
    parts.push(`USER QUESTION: ${question}`);
    parts.push('');
    parts.push('Generate a simple, correct PostgreSQL SELECT query. Output ONLY the SQL, nothing else:');

    return parts.join('\n');
  }
}

export const promptBuilder = new PromptBuilder();
