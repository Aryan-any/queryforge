import { LLMProvider } from './base';
import { LLMProviderType } from '../../utils/types';
import logger from '../../utils/logger';

/**
 * OpenAI LLM Provider
 * Uses direct HTTP API calls (no SDK dependency) for SQL generation.
 */
export class OpenAIProvider implements LLMProvider {
  readonly name: LLMProviderType = 'openai';
  readonly model: string;

  constructor(model: string = 'gpt-4o-mini') {
    this.model = model;
  }

  async generate(prompt: string, apiKey: string, systemPrompt?: string): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('OpenAI API error', { status: response.status, body: errorBody });
      throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    logger.debug('OpenAI response received', { 
      model: this.model, 
      tokens: data.usage?.total_tokens 
    });

    return content.trim();
  }
}
