import { LLMProviderType } from '../../utils/types';

/**
 * Abstract base interface for LLM providers.
 * Enables swapping between OpenAI, Claude, Gemini, etc.
 */
export interface LLMProvider {
  readonly name: LLMProviderType;
  readonly model: string;

  /**
   * Generate a completion from a prompt.
   * Returns the raw text response.
   */
  generate(prompt: string, apiKey: string, systemPrompt?: string): Promise<string>;
}
