import { resolve } from 'path';
import { homedir } from 'os';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

export interface ProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface Settings {
  activeProvider: string;
  theme: string;
  providers: { [key: string]: ProviderConfig };
  // UI / runtime options persisted for the CLI
  humanizeLevel?: 'low' | 'standard' | 'aggressive';
  debug?: boolean;
}

const CONFIG_DIR = resolve(homedir(), '.redactum');
const SETTINGS_FILE = resolve(CONFIG_DIR, 'settings.json');

const DEFAULT_SETTINGS: Settings = {
  activeProvider: 'openai',
  theme: 'opencode',
  providers: {},
  humanizeLevel: 'standard',
  debug: false,
};

export function loadSettings(): Settings {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const data = readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: Settings): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

export function updateProviderApiKey(provider: string, apiKey: string): void {
  const settings = loadSettings();
  if (!settings.providers[provider]) {
    settings.providers[provider] = { apiKey };
  } else {
    settings.providers[provider].apiKey = apiKey;
  }
  saveSettings(settings);
}

export function updateProviderModel(provider: string, model: string): void {
  const settings = loadSettings();
  if (!settings.providers[provider]) {
    settings.providers[provider] = { apiKey: '', model };
  } else {
    settings.providers[provider].model = model;
  }
  saveSettings(settings);
}

export function getConfiguredProviders(): string[] {
  const settings = loadSettings();
  return Object.entries(settings.providers)
    .filter(([_, config]) => config.apiKey)
    .map(([name, _]) => name);
}

export function hasAnyProviderConfigured(): boolean {
  return getConfiguredProviders().length > 0;
}

export function getActiveProviderConfig(): ProviderConfig | null {
  const settings = loadSettings();
  const provider = settings.providers[settings.activeProvider];
  if (provider?.apiKey) {
    return {
      apiKey: provider.apiKey,
      model: provider.model || 'gpt-4o',
      baseUrl: provider.baseUrl,
    };
  }
  return null;
}
