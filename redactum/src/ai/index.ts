import type { AIProvider, AIConfig } from './types.js';
import { OpenAIProvider } from './openai.js';
import { GrokProvider } from './grok.js';
import { GroqProvider } from './groq.js';
import { NvidiaProvider } from './nvidia.js';

export function createAIProvider(config: AIConfig): AIProvider {
  const provider = config.provider.toLowerCase();
  
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'grok':
    case 'xai':
      return new GrokProvider(config);
    case 'groq':
      return new GroqProvider(config);
    case 'nvidia':
    case 'nim':
      return new NvidiaProvider(config);
    case 'anthropic':
      return new OpenAIProvider({
        ...config,
        baseUrl: 'https://api.anthropic.com/v1',
      });
    case 'together':
      return new OpenAIProvider({
        ...config,
        baseUrl: config.baseUrl || 'https://api.together.xyz/v1',
      });
    case 'openrouter':
      return new OpenAIProvider({
        ...config,
        baseUrl: config.baseUrl || 'https://openrouter.ai/api/v1',
      });
    case 'ollama':
      return new OpenAIProvider({
        ...config,
        baseUrl: config.baseUrl || 'http://localhost:11434/v1',
      });
    case 'custom':
      return new OpenAIProvider(config);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}. Supported: openai, groq, nvidia, xai/grok, anthropic, together, openrouter, ollama, custom`);
  }
}

export * from './types.js';
export { OpenAIProvider } from './openai.js';
export { GrokProvider } from './grok.js';
export { GroqProvider } from './groq.js';
export { NvidiaProvider } from './nvidia.js';