import React, { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInputImport from 'ink-text-input';
const TextInput = (TextInputImport as any).default || TextInputImport;
import type { Theme } from '../utils/themes.js';
import { loadSettings, saveSettings, type Settings } from '../utils/settings.js';

interface SettingsViewProps {
  theme: Theme;
  onClose: () => void;
  onSettingsChange: () => void;
}

type SettingsState =
  | { type: 'menu' }
  | { type: 'provider-list' }
  | { type: 'active-provider-list' }
  | { type: 'provider-config'; provider: string }
  | { type: 'api-key-input'; provider: string }
  | { type: 'model-input'; provider: string }
  | { type: 'humanize-config' }
  | { type: 'debug-config' };

const MENU_ITEMS = [
  { id: 'providers', label: 'Configure Providers', description: 'Add or edit API keys' },
  { id: 'active', label: 'Select Active Provider', description: 'Choose which provider to use' },
  { id: 'humanize', label: 'Humanize Level', description: 'low | standard | aggressive' },
  { id: 'debug', label: 'Debug Mode', description: 'Include postprocess debug reports' },
];

const PROVIDERS = ['openai', 'groq', 'nvidia', 'xai', 'anthropic', 'together', 'openrouter', 'ollama', 'custom'];

export const SettingsView: React.FC<SettingsViewProps> = ({ theme, onClose, onSettingsChange }) => {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns || 80;
  const availableWidth = termWidth - 5;
  
  const [state, setState] = useState<SettingsState>({ type: 'menu' });
  const [menuIndex, setMenuIndex] = useState(0);
  const [providerIndex, setProviderIndex] = useState(0);
  const [configIndex, setConfigIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [settings, setSettings] = useState<Settings>(loadSettings());
  const [message, setMessage] = useState<string | null>(null);

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    onSettingsChange();
  };

  useInput((input, key) => {
    setMessage(null);

    if (key.escape) {
      if (state.type === 'menu') {
        onClose();
      } else if (state.type === 'provider-config') {
        setState({ type: 'provider-list' });
      } else if (state.type === 'api-key-input' || state.type === 'model-input') {
        setState({ type: 'provider-config', provider: (state as any).provider });
        setInputValue('');
      } else {
        setState({ type: 'menu' });
      }
      return;
    }

    if (state.type === 'menu') {
      if (key.upArrow) {
        setMenuIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setMenuIndex(prev => Math.min(MENU_ITEMS.length - 1, prev + 1));
      } else if (key.return) {
        const sel = MENU_ITEMS[menuIndex].id;
        if (sel === 'providers') {
          setState({ type: 'provider-list' });
          setProviderIndex(0);
        } else if (sel === 'active') {
          setState({ type: 'active-provider-list' });
          setProviderIndex(Math.max(0, PROVIDERS.indexOf(settings.activeProvider)));
        } else if (sel === 'humanize') {
          // Enter humanize level configuration
          setState({ type: 'humanize-config' });
        } else if (sel === 'debug') {
          setState({ type: 'debug-config' });
        }
      }
      return;
    }

    if (state.type === 'provider-list' || state.type === 'active-provider-list') {
      if (key.upArrow) {
        setProviderIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setProviderIndex(prev => Math.min(PROVIDERS.length - 1, prev + 1));
      } else if (key.return) {
        const provider = PROVIDERS[providerIndex];
        if (state.type === 'active-provider-list') {
          const newSettings = { ...settings, activeProvider: provider };
          handleSaveSettings(newSettings);
          setMessage(`${provider} set as active provider`);
          setState({ type: 'menu' });
        } else {
          setState({ type: 'provider-config', provider });
          setConfigIndex(0);
        }
      }
      return;
    }

      if (state.type === 'provider-config') {
        var configOptions = ['api-key', 'model', 'back'];
      } else if (state.type === 'humanize-config') {
      // Allow changing humanize level via arrow keys and Enter
      if (key.upArrow || key.downArrow) {
        // cycle through options low -> standard -> aggressive
        const order = ['low', 'standard', 'aggressive'] as const;
        const current = (settings.humanizeLevel as 'low'|'standard'|'aggressive') || 'standard';
        const idx = order.indexOf(current);
        const next = key.upArrow ? order[(idx - 1 + order.length) % order.length] : order[(idx + 1) % order.length];
        const newSettings = { ...settings, humanizeLevel: next as 'low'|'standard'|'aggressive' };
        handleSaveSettings(newSettings);
        setMessage(`Humanize level set to ${next}`);
      } else if (key.return || key.escape) {
        setState({ type: 'menu' });
      }
      return;
    } else if (state.type === 'debug-config') {
      // Toggle debug mode on return or toggle with arrows
      if (key.return) {
        const newSettings = { ...settings, debug: !Boolean(settings.debug) };
        handleSaveSettings(newSettings);
        setMessage(`Debug mode ${newSettings.debug ? 'enabled' : 'disabled'}`);
        setState({ type: 'menu' });
      } else if (key.escape) {
        setState({ type: 'menu' });
      }
      return;
      if (key.upArrow) {
        setConfigIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setConfigIndex(prev => Math.min(configOptions.length - 1, prev + 1));
      } else if (key.return) {
        const option = configOptions[configIndex];
        const provider = (state as { provider: string }).provider;
        if (option === 'api-key') {
          setInputValue(settings.providers[provider]?.apiKey || '');
          setState({ type: 'api-key-input', provider });
        } else if (option === 'model') {
          setInputValue(settings.providers[provider]?.model || 'gpt-4o');
          setState({ type: 'model-input', provider });
        } else if (option === 'back') {
          setState({ type: 'provider-list' });
        }
      }
      return;
    }

    if (state.type === 'api-key-input' || state.type === 'model-input') {
      if (key.return) {
        const provider = (state as any).provider;
        const currentProviderConfig = settings.providers[provider] || { apiKey: '', model: 'gpt-4o' };

        let newProviderConfig = { ...currentProviderConfig };
        if (state.type === 'api-key-input') {
          newProviderConfig.apiKey = inputValue;
        } else if (state.type === 'model-input') {
          newProviderConfig.model = inputValue;
        }

        const newSettings = {
          ...settings,
          providers: {
            ...settings.providers,
            [provider]: newProviderConfig,
          },
        };
        handleSaveSettings(newSettings);
        setMessage('Saved successfully');
        setState({ type: 'provider-config', provider });
        setInputValue('');
      }
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Menu */}
      {state.type === 'menu' && (
        <>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.primary} bold>
              {' '}Settings{' '.repeat(Math.max(0, availableWidth - 'Settings'.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>

          {MENU_ITEMS.map((item, index) => (
            <Text key={item.id}>
              <Text color={theme.colors.primary}>▊</Text>
              <Text backgroundColor={theme.colors.inputBackground}>
                <Text color={index === menuIndex ? theme.colors.primary : theme.colors.textDim} backgroundColor={theme.colors.inputBackground}>
                  {' '}{index === menuIndex ? '▸ ' : '  '}{item.label}
                </Text>
                <Text color={theme.colors.muted} backgroundColor={theme.colors.inputBackground}>
                  {' - '}{item.description}
                </Text>
                {' '.repeat(Math.max(0, availableWidth - `${item.label} - ${item.description}`.length - 4))}
              </Text>
            </Text>
          ))}

          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.textDim}>
              {' '}Active: {settings.activeProvider}{settings.providers[settings.activeProvider]?.model ? ` (${settings.providers[settings.activeProvider].model})` : ''}{' '.repeat(Math.max(0, availableWidth - `Active: ${settings.activeProvider}${settings.providers[settings.activeProvider]?.model ? ` (${settings.providers[settings.activeProvider].model})` : ''}`.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.textDim}>
              {' '}↑↓ navigate • Enter select • Esc close{' '.repeat(Math.max(0, availableWidth - '↑↓ navigate • Enter select • Esc close'.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
        </>
      )}

      {/* Provider List */}
      {(state.type === 'provider-list' || state.type === 'active-provider-list') && (
        <>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.primary} bold>
              {' '}{state.type === 'active-provider-list' ? 'Select Active Provider' : 'Configure Provider'}{' '.repeat(Math.max(0, availableWidth - (state.type === 'active-provider-list' ? 'Select Active Provider' : 'Configure Provider').length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>

          {PROVIDERS.map((provider, index) => {
            const isActive = settings.activeProvider === provider;
            const hasApiKey = !!settings.providers[provider]?.apiKey;
            const suffix = `${isActive ? ' ●' : ''}${hasApiKey ? ' ✓' : ''}`;
            return (
              <Text key={provider}>
                <Text color={theme.colors.primary}>▊</Text>
                <Text backgroundColor={theme.colors.inputBackground} color={index === providerIndex ? theme.colors.primary : theme.colors.textDim}>
                  {' '}{index === providerIndex ? '▸ ' : '  '}{provider}{suffix}{' '.repeat(Math.max(0, availableWidth - `${provider}${suffix}`.length - 4))}
                </Text>
              </Text>
            );
          })}

          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.textDim}>
              {' '}↑↓ navigate • Enter select • Esc back{' '.repeat(Math.max(0, availableWidth - '↑↓ navigate • Enter select • Esc back'.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
        </>
      )}

      {/* Provider Config */}
      {state.type === 'provider-config' && (
        <>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.primary} bold>
              {' '}Configure {state.provider}{' '.repeat(Math.max(0, availableWidth - `Configure ${state.provider}`.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>

          {['api-key', 'model', 'back'].map((option, index) => (
            <Text key={option}>
              <Text color={theme.colors.primary}>▊</Text>
              <Text backgroundColor={theme.colors.inputBackground} color={index === configIndex ? theme.colors.primary : theme.colors.textDim}>
                {' '}{index === configIndex ? '▸ ' : '  '}{option === 'api-key' ? 'Set API Key' : option === 'model' ? 'Set Model' : 'Back'}{' '.repeat(Math.max(0, availableWidth - (option === 'api-key' ? 'Set API Key' : option === 'model' ? 'Set Model' : 'Back').length - 4))}
              </Text>
            </Text>
          ))}

          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.textDim}>
              {' '}↑↓ navigate • Enter select • Esc back{' '.repeat(Math.max(0, availableWidth - '↑↓ navigate • Enter select • Esc back'.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
        </>
      )}

      {/* Input states */}
      {(state.type === 'api-key-input' || state.type === 'model-input') && (
        <>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.textDim}>
              {' '}{state.type === 'api-key-input' ? `Enter API key for ${state.provider}:` : `Enter model for ${state.provider} (e.g., gpt-4o):`}{' '.repeat(Math.max(0, availableWidth - (state.type === 'api-key-input' ? `Enter API key for ${state.provider}:` : `Enter model for ${state.provider} (e.g., gpt-4o):`).length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>
              {' '}
              <TextInput 
                value={inputValue} 
                onChange={setInputValue}
                placeholder={state.type === 'api-key-input' ? 'sk-...' : 'gpt-4o'}
              />
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.textDim}>
              {' '}Enter save • Esc cancel{' '.repeat(Math.max(0, availableWidth - 'Enter save • Esc cancel'.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
        </>
      )}

      {/* Success message */}
      {message && (
        <Box flexDirection="column" marginTop={1}>
          <Text>
            <Text color={theme.colors.success}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.success}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.success}>
              {' '}{message}{' '.repeat(Math.max(0, availableWidth - message.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.success}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
};
