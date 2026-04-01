import { LLMProvider } from './base';
import { LLMProviderType } from '../../utils/types';
import logger from '../../utils/logger';

/**
 * Anthropic Claude LLM Provider
 * Stub implementation — ready for full integration.
 */
export class ClaudeProvider implements LLMProvider {
  readonly name: LLMProviderType = 'claude';
  readonly model: string;

  constructor(model: string = 'claude-sonnet-4-20250514') {
    this.model = model;
  }

  async generate(prompt: string, apiKey: string, systemPrompt?: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt || '',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Claude API error', { status: response.status, body: errorBody });
      throw new Error(`Claude API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const content = data.content?.[0]?.text;
    if (!content) {
      throw new Error('Empty response from Claude');
    }

    return content.trim();
  }
}
