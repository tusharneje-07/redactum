import OpenAI from 'openai';
import type { AIProvider, AIConfig } from './types.js';

export class GrokProvider implements AIProvider {
  name = 'grok';
  private client: OpenAI;
  private model: string;

  constructor(config: AIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.x.ai/v1',
    });
    this.model = config.model || 'grok-beta';
  }

  async generateCompletion(prompt: string, temperature: number = 0.4): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert writing assistant focused on improving text quality, grammar, and tone.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from Grok');
      }

      return content.trim();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Grok API error: ${error.message}`);
      }
      throw new Error('Unknown error occurred while calling Grok API');
    }
  }
}