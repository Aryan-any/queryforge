import { SchemaInfo, TableInfo } from '../utils/types';
import { schemaService } from '../services/schemaService';

/**
 * Schema Summarizer
 * 
 * Converts raw schema JSON into a human-readable format
 * optimized for LLM consumption. Incorporates RAG techniques to bound context.
 */
export class SchemaSummarizer {
  /**
   * Generate a concise summary suitable for LLM prompts.
   * Uses keyword-based RAG extraction if a question is provided.
   */
  summarize(schema: SchemaInfo, question?: string): string {
    const activeSchema = question ? this.pruneSchema(schema, question) : schema;
    return schemaService.generateSummary(activeSchema);
  }

  /**
   * Evaluates the user query against the schema and filters out irrelevant tables.
   */
  private pruneSchema(schema: SchemaInfo, question: string): SchemaInfo {
    const stopWords = new Set(['what','is','the','show','me','how','many','of','in','and','for','a','to','give','which','are','list','get','all','count']);
    const keywords = (question.toLowerCase().match(/\b[a-z0-9_]+\b/g) || []).filter(w => !stopWords.has(w));

    // If query has no useful keywords or schema is small, return full schema
    if (keywords.length === 0 || schema.tables.length <= 5) return schema;

    const scores = new Map<string, number>();

    // Pass 1: Score tables
    for (const table of schema.tables) {
      let score = 0;
      const tName = table.name.toLowerCase();
      
      for (const kw of keywords) {
        if (tName.includes(kw)) score += 10;
        
        for (const col of table.columns) {
          if (col.name.toLowerCase().includes(kw)) score += 3;
          if (col.sampleValues && col.sampleValues.some(v => v.toLowerCase().includes(kw))) score += 2;
        }
      }
      scores.set(table.name, score);
    }

    // Pass 2: Select top 5 tables
    const topTables = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);

    // Pass 3: Gather mandatory Foreign Key dependencies for the selected tables
    const requiredTables = new Set<string>(topTables);
    for (const rel of schema.relationships) {
      if (topTables.includes(rel.fromTable)) requiredTables.add(rel.toTable);
      if (topTables.includes(rel.toTable)) requiredTables.add(rel.fromTable);
    }

    // Build constrained schema
    const prunedTables = schema.tables.filter(t => requiredTables.has(t.name));
    
    return {
      ...schema,
      tables: prunedTables,
    };
  }

  /**
   * Generate a compact summary (for token-constrained contexts).
   */
  summarizeCompact(schema: SchemaInfo): string {
    const lines: string[] = [];

    for (const table of schema.tables) {
      const cols = table.columns
        .map(c => {
          const pk = c.isPrimaryKey ? ' PK' : '';
          return `${c.name}:${c.dataType}${pk}`;
        })
        .join(', ');
      
      lines.push(`${table.name}(${cols})`);

      // Foreign keys
      for (const fk of table.foreignKeys) {
        lines.push(`  FK: ${fk.columnName} -> ${fk.referencedTable}.${fk.referencedColumn}`);
      }
    }

    return lines.join('\n');
  }
}

export const schemaSummarizer = new SchemaSummarizer();
