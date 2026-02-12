export interface AIProvider {
  name: string;
  generateCompletion(prompt: string, temperature?: number): Promise<string>;
}

export interface AIConfig {
  provider: string;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}