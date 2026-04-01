import { LLMProvider } from './providers/base';
import { OpenAIProvider } from './providers/openai';
import { ClaudeProvider } from './providers/claude';
import { GeminiProvider } from './providers/gemini';
import { promptBuilder } from './promptBuilder';
import { schemaSummarizer } from './schemaSummarizer';
import { sqlValidator } from '../validators/sqlValidator';
import { ConversationEntry, LLMGenerationResult, LLMProviderType, SchemaInfo } from '../utils/types';
import { config } from '../config';
import logger from '../utils/logger';
import crypto from 'crypto';

interface GenCacheEntry {
  result: LLMGenerationResult;
  timestamp: number;
}

const genCache = new Map<string, GenCacheEntry>();
const GEN_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours semantic cache

/**
 * SQL Generator
 * 
 * Orchestrates the full flow: prompt building → LLM call → SQL extraction → validation.
 * Includes retry logic with fallback prompts.
 */
export class SQLGenerator {
  private providers: Map<LLMProviderType, LLMProvider>;

  constructor() {
    this.providers = new Map([
      ['openai', new OpenAIProvider()],
      ['claude', new ClaudeProvider()],
      ['gemini', new GeminiProvider()],
    ]);
  }

  /**
   * Generate SQL from a natural language question.
   */
  async generate(
    question: string,
    schema: SchemaInfo,
    apiKey: string,
    providerType: LLMProviderType = 'openai',
    conversationHistory: ConversationEntry[] = []
  ): Promise<LLMGenerationResult> {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Unsupported LLM provider: ${providerType}`);
    }

    // Attempt Semantic Cache bypass
    const cacheKeyBasis = `${providerType}:${schema.generatedAt}:${question.toLowerCase()}:${JSON.stringify(conversationHistory)}`;
    const cacheKey = crypto.createHash('md5').update(cacheKeyBasis).digest('hex');
    const cached = genCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < GEN_CACHE_TTL_MS)) {
      logger.info('Semantic cache hit, bypassing LLM generation (0ms latency)', { provider: providerType });
      return cached.result;
    }

    const schemaSummary = schemaSummarizer.summarize(schema, question);
    const systemPrompt = promptBuilder.buildSystemPrompt();

    let lastError: string | undefined;

    // Retry up to maxRetries times
    for (let attempt = 1; attempt <= config.llm.maxRetries; attempt++) {
      try {
        // Build prompt (use fallback on retry)
        const userPrompt = attempt === 1
          ? promptBuilder.buildUserPrompt(question, schemaSummary, conversationHistory)
          : promptBuilder.buildFallbackPrompt(question, schemaSummary, lastError);

        logger.info(`SQL generation attempt ${attempt}/${config.llm.maxRetries}`, {
          provider: providerType,
          question: question.substring(0, 100),
        });

        // Call LLM
        const rawResponse = await provider.generate(userPrompt, apiKey, systemPrompt);

        // Extract SQL from response (strip markdown code fences if present)
        const sql = this.extractSQL(rawResponse);

        // Validate SQL safety
        const validation = sqlValidator.validate(sql);
        if (!validation.isValid) {
          lastError = `SQL validation failed: ${validation.errors.join(', ')}`;
          logger.warn('SQL validation failed', { attempt, errors: validation.errors });
          
          if (attempt === config.llm.maxRetries) {
            throw new Error(lastError);
          }
          continue;
        }

        // Apply safety transformations (add LIMIT, etc.)
        const safeSql = sqlValidator.applySafetyTransforms(sql);

        const finalResult: LLMGenerationResult = {
          sql: safeSql,
          provider: providerType,
          model: provider.model,
        };

        // Cache the successful result
        genCache.set(cacheKey, { result: finalResult, timestamp: Date.now() });

        // Lazy cleanup
        if (Math.random() < 0.05) {
          const now = Date.now();
          for (const [k, v] of genCache.entries()) {
            if (now - v.timestamp > GEN_CACHE_TTL_MS) genCache.delete(k);
          }
        }

        return finalResult;
      } catch (error) {
        lastError = (error as Error).message;
        logger.error(`SQL generation attempt ${attempt} failed`, {
          error: lastError,
          provider: providerType,
        });

        if (attempt === config.llm.maxRetries) {
          throw new Error(`SQL generation failed after ${config.llm.maxRetries} attempts: ${lastError}`);
        }

        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        logger.info(`Applying exponential backoff of ${backoffMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    throw new Error('SQL generation failed: exhausted all retries');
  }

  /**
   * Extract clean SQL from LLM response.
   * Handles cases where the model wraps SQL in markdown code fences.
   */
  private extractSQL(response: string): string {
    let sql = response.trim();

    // Remove markdown code fences
    if (sql.startsWith('```sql')) {
      sql = sql.slice(6);
    } else if (sql.startsWith('```')) {
      sql = sql.slice(3);
    }
    if (sql.endsWith('```')) {
      sql = sql.slice(0, -3);
    }

    // Remove any remaining backticks
    sql = sql.replace(/^`+|`+$/g, '');

    return sql.trim();
  }
}

export const sqlGenerator = new SQLGenerator();
