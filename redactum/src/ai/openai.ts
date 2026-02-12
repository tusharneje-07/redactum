import OpenAI from 'openai';
import type { AIProvider, AIConfig } from './types.js';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(config: AIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.model = config.model || 'gpt-4o';
  }

  async generateCompletion(prompt: string, temperature: number = 0.4): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are an expert writing assistant focused on improving text quality, grammar, and tone.' },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: 2000,
    });
    
    return response.choices[0]?.message?.content?.trim() || '';
  }
}