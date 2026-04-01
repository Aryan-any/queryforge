import { Router, Request, Response } from 'express';
import { connectionService } from '../services/connectionService';
import { schemaService } from '../services/schemaService';
import { queryService } from '../services/queryService';
import { visualizationService } from '../services/visualizationService';
import { sqlGenerator } from '../llm/sqlGenerator';
import { ConversationEntry, LLMProviderType } from '../utils/types';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/query
 * Natural language → SQL → Execute → Results + Visualization
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { question, conversationHistory, apiKey, provider } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ success: false, error: 'Question is required' });
      return;
    }

    if (!apiKey || typeof apiKey !== 'string') {
      res.status(400).json({ success: false, error: 'API key is required' });
      return;
    }

    // Get active database pool
    const pool = connectionService.getActivePool(
      req.session.activeConnection,
      req.session.connectionId
    );

    // Get schema for SQL generation context
    const schema = await schemaService.getSchema(pool);

    // Generate SQL via LLM
    const llmResult = await sqlGenerator.generate(
      question,
      schema,
      apiKey,
      (provider as LLMProviderType) || 'openai',
      (conversationHistory as ConversationEntry[]) || []
    );

    logger.info('SQL generated', {
      question: question.substring(0, 100),
      sql: llmResult.sql.substring(0, 200),
      provider: llmResult.provider,
    });

    // Execute the generated SQL
    const queryResult = await queryService.execute(pool, llmResult.sql);

    // Get visualization recommendation
    const vizRecommendation = visualizationService.recommend(
      queryResult.columns,
      queryResult.rows
    );

    queryResult.visualization = vizRecommendation;

    res.json({
      success: true,
      data: {
        question,
        ...queryResult,
        llm: {
          provider: llmResult.provider,
          model: llmResult.model,
        },
      },
    });
  } catch (error) {
    logger.error('Query processing failed', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/query/sql
 * Execute a raw SQL query (still validated for safety).
 */
router.post('/sql', async (req: Request, res: Response) => {
  try {
    const { sql } = req.body;

    if (!sql || typeof sql !== 'string') {
      res.status(400).json({ success: false, error: 'SQL query is required' });
      return;
    }

    // Import and validate
    const { sqlValidator } = await import('../validators/sqlValidator');
    const validation = sqlValidator.validate(sql);
    
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        error: `SQL validation failed: ${validation.errors.join(', ')}`,
      });
      return;
    }

    const safeSql = sqlValidator.applySafetyTransforms(sql);

    const pool = connectionService.getActivePool(
      req.session.activeConnection,
      req.session.connectionId
    );

    const queryResult = await queryService.execute(pool, safeSql);
    const vizRecommendation = visualizationService.recommend(
      queryResult.columns,
      queryResult.rows
    );

    queryResult.visualization = vizRecommendation;

    res.json({ success: true, data: queryResult });
  } catch (error) {
    logger.error('SQL execution failed', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
