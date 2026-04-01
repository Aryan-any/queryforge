import { LLMProvider } from './base';
import { LLMProviderType } from '../../utils/types';
import logger from '../../utils/logger';

/**
 * Google Gemini LLM Provider
 * Stub implementation — ready for full integration.
 */
export class GeminiProvider implements LLMProvider {
  readonly name: LLMProviderType = 'gemini';
  readonly model: string;

  constructor(model: string = 'gemini-2.5-flash-lite') {
    this.model = model;
  }

  async generate(prompt: string, apiKey: string, systemPrompt?: string): Promise<string> {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Gemini API error', { status: response.status, body: errorBody });
      throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('Empty response from Gemini');
    }

    return content.trim();
  }
}
