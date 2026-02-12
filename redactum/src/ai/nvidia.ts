import OpenAI from 'openai';
import type { AIProvider, AIConfig } from './types.js';

export class NvidiaProvider implements AIProvider {
  name = 'nvidia';
  private client: OpenAI;
  private model: string;

  constructor(config: AIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://integrate.api.nvidia.com/v1',
    });
    this.model = config.model || 'meta/llama-3.1-70b-instruct';
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
        throw new Error('No content returned from NVIDIA NIM');
      }

      return content.trim();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`NVIDIA NIM API error: ${error.message}`);
      }
      throw new Error('Unknown error occurred while calling NVIDIA NIM API');
    }
  }
}