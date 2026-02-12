import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { Header } from './Header.js';
import { Footer } from './Footer.js';
import { SettingsView } from './SettingsView.js';
import { TextInputWithBg } from './TextInputWithBg.js';
import { loadSettings, saveSettings, hasAnyProviderConfigured, getActiveProviderConfig, type Settings } from '../utils/settings.js';
import { getTheme, themes, type Theme } from '../utils/themes.js';
import { TONES, type ToneType } from '../utils/tones.js';
import { createRefinementPrompt } from '../config/prompts.js';
import { createAIProvider } from '../ai/index.js';
import { copyToClipboard } from '../utils/clipboard.js';

interface Command {
  name: string;
  description: string;
}

const COMMANDS: Command[] = [
  { name: '/settings', description: 'Configure API keys and providers' },
  { name: '/theme', description: 'Change color theme' },
];

type AppState =
  | { type: 'input' }
  | { type: 'tone-select'; text: string }
  | { type: 'generating'; text: string; tone: ToneType }
  | { type: 'output'; original: string; refined: string; tone: ToneType }
  | { type: 'settings' }
  | { type: 'theme-select' }
  | { type: 'error'; message: string };

export const App: React.FC = () => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  
  const [settings, setSettings] = useState<Settings>(loadSettings());
  const [theme, setTheme] = useState<Theme>(getTheme(settings.theme));
  const [state, setState] = useState<AppState>({ type: 'input' });
  
  const [input, setInput] = useState('');
  const [selectedToneIndex, setSelectedToneIndex] = useState(0);
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(
    themes.findIndex(t => t.name === settings.theme)
  );
  const [copied, setCopied] = useState(false);
  const [suggestions, setSuggestions] = useState<Command[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const termWidth = stdout?.columns || 80;
  const availableWidth = termWidth - 5;

  useEffect(() => {
    if (!hasAnyProviderConfigured()) {
      setState({ type: 'settings' });
    }
  }, []);

  useEffect(() => {
    if (state.type === 'theme-select') {
      setTheme(themes[selectedThemeIndex]);
    }
  }, [selectedThemeIndex, state.type]);

  const handleSettingsChange = useCallback(() => {
    const newSettings = loadSettings();
    setSettings(newSettings);
    setTheme(getTheme(newSettings.theme));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!input.trim()) return;
    
    setState({ type: 'tone-select', text: input });
  }, [input]);

  const handleToneConfirm = useCallback(async () => {
    if (state.type !== 'tone-select') return;
    
    const tone = TONES[selectedToneIndex].id as ToneType;
    setState({ type: 'generating', text: state.text, tone });
    
    try {
      const providerConfig = getActiveProviderConfig();
      if (!providerConfig) {
        throw new Error('No AI provider configured. Run /settings to configure.');
      }

      const provider = createAIProvider({
        provider: settings.activeProvider,
        apiKey: providerConfig.apiKey,
        model: providerConfig.model,
        baseUrl: providerConfig.baseUrl,
      });

      const toneInfo = TONES[selectedToneIndex];
      const prompt = createRefinementPrompt(state.text, toneInfo.id, toneInfo.instruction);
      const refinedText = await provider.generateCompletion(prompt, 0.4);
      
      setState({ 
        type: 'output', 
        original: state.text, 
        refined: refinedText,
        tone 
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setState({ type: 'error', message: errorMessage });
    }
  }, [state, selectedToneIndex, settings]);

  // Handle input changes and update suggestions
  const handleInputChange = (value: string) => {
    setInput(value);
    
    // Show suggestions for / commands
    if (value.startsWith('/')) {
      const query = value.toLowerCase();
      const filtered = COMMANDS.filter(cmd => 
        cmd.name.toLowerCase().startsWith(query)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedSuggestionIndex(0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle input submission
  const handleInputSubmit = useCallback(() => {
    if (input.startsWith('/')) {
      const cmd = input.trim();
      if (cmd === '/settings') {
        setInput('');
        setSuggestions([]);
        setShowSuggestions(false);
        setState({ type: 'settings' });
      } else if (cmd === '/theme') {
        setInput('');
        setSuggestions([]);
        setShowSuggestions(false);
        setState({ type: 'theme-select' });
      } else {
        setState({ type: 'error', message: `Unknown command: ${cmd}` });
        setInput('');
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else if (input.trim()) {
      handleGenerate();
    }
  }, [input, handleGenerate]);

  useInput((inputStr, key) => {
    // Global Ctrl+C
    if (key.ctrl && inputStr === 'c') {
      process.exit(0);
      return;
    }

    // Handle command suggestions
    if (state.type === 'input' && showSuggestions && suggestions.length > 0) {
      if (key.upArrow) {
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      
      if (key.downArrow) {
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      
      if (key.tab || key.return) {
        const selected = suggestions[selectedSuggestionIndex];
        setInput(selected.name);
        setSuggestions([]);
        setShowSuggestions(false);
        if (key.return) {
          // Execute command on Enter
          if (selected.name === '/settings') {
            setState({ type: 'settings' });
          } else if (selected.name === '/theme') {
            setState({ type: 'theme-select' });
          }
          setInput('');
        }
        return;
      }
    }

    // Handle Enter in input mode (when no suggestions)
    if (state.type === 'input' && key.return && !showSuggestions) {
      handleInputSubmit();
      return;
    }

    // Handle tone selection
    if (state.type === 'tone-select') {
      if (key.upArrow) {
        setSelectedToneIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedToneIndex(prev => Math.min(TONES.length - 1, prev + 1));
      } else if (key.return) {
        handleToneConfirm();
      } else if (key.escape) {
        setState({ type: 'input' });
      }
      return;
    }

    // Handle theme selection
    if (state.type === 'theme-select') {
      if (key.upArrow) {
        setSelectedThemeIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedThemeIndex(prev => Math.min(themes.length - 1, prev + 1));
      } else if (key.return) {
        const newSettings = { ...settings, theme: themes[selectedThemeIndex].name };
        saveSettings(newSettings);
        setSettings(newSettings);
        setState({ type: 'input' });
      } else if (key.escape) {
        setTheme(getTheme(settings.theme));
        setSelectedThemeIndex(themes.findIndex(t => t.name === settings.theme));
        setState({ type: 'input' });
      }
      return;
    }

    // Handle output state
    if (state.type === 'output') {
      if (inputStr === 'c' || inputStr === 'C') {
        copyToClipboard(state.refined);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else if (inputStr === 'n' || inputStr === 'N') {
        setInput('');
        setState({ type: 'input' });
      } else if (key.escape) {
        setInput('');
        setState({ type: 'input' });
      }
      return;
    }

    // Handle error state
    if (state.type === 'error') {
      if (key.escape || key.return) {
        setState({ type: 'input' });
      }
      return;
    }
  });

  // Settings view
  if (state.type === 'settings') {
    return (
      <Box flexDirection="column" width="100%" paddingX={2} paddingY={1}>
        <Header theme={theme} activeProvider={settings.activeProvider} model={settings.providers[settings.activeProvider]?.model} />
        <SettingsView theme={theme} onClose={() => setState({ type: 'input' })} onSettingsChange={handleSettingsChange} />
      </Box>
    );
  }

  const activeProvider = settings.providers[settings.activeProvider];
  
  return (
    <Box flexDirection="column" width="100%" paddingX={2} paddingY={1}>
      <Header theme={theme} activeProvider={settings.activeProvider} model={activeProvider?.model} />

      {/* Input area */}
      {state.type === 'input' && (
        <Box flexDirection="column" marginTop={1} flexGrow={1}>
          <TextInputWithBg
            value={input}
            onChange={handleInputChange}
            placeholder="Enter your text or type a command (/settings, /theme)..."
            focus={true}
            backgroundColor={theme.colors.inputBackground}
            textColor={theme.colors.text}
            placeholderColor={theme.colors.muted}
            borderColor={theme.colors.borderFocus}
          />

          {/* Command Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <Box flexDirection="column" marginTop={1} flexGrow={1}>
              {/* Top padding line */}
              <Text>
                <Text color={theme.colors.border}>▊</Text>
                <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
              </Text>
              
              {/* Header line */}
              <Text>
                <Text color={theme.colors.border}>▊</Text>
                <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.secondary} bold>
                  {' '}Commands{' '.repeat(Math.max(0, availableWidth - 'Commands'.length - 2))}
                </Text>
              </Text>
              
              {/* Empty line */}
              <Text>
                <Text color={theme.colors.border}>▊</Text>
                <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
              </Text>
              
              {/* Suggestion items */}
              {suggestions.map((cmd, index) => {
                const prefix = index === selectedSuggestionIndex ? '▸ ' : '  ';
                const text = `${prefix}${cmd.name} - ${cmd.description}`;
                return (
                  <Text key={cmd.name}>
                    <Text color={theme.colors.border}>▊</Text>
                    <Text backgroundColor={theme.colors.inputBackground}>
                      <Text 
                        color={index === selectedSuggestionIndex ? theme.colors.primary : theme.colors.textDim}
                        bold={index === selectedSuggestionIndex}
                        backgroundColor={theme.colors.inputBackground}
                      >
                        {' '}{prefix}{cmd.name}
                      </Text>
                      <Text color={theme.colors.muted} backgroundColor={theme.colors.inputBackground}>
                        {' - '}{cmd.description}
                      </Text>
                      {' '.repeat(Math.max(0, availableWidth - text.length - 1))}
                    </Text>
                  </Text>
                );
              })}
              
              {/* Bottom padding line */}
              <Text>
                <Text color={theme.colors.border}>▊</Text>
                <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Tone selector */}
      {state.type === 'tone-select' && (
        <Box flexDirection="column" marginTop={1} flexGrow={1}>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.primary} bold>
              {' '}Select Tone{' '.repeat(Math.max(0, availableWidth - 'Select Tone'.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.textDim}>
              {' '}Choose the tone for your refined text:{' '.repeat(Math.max(0, availableWidth - 'Choose the tone for your refined text:'.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>

          {TONES.map((tone, index) => {
            const text = `${index === selectedToneIndex ? '▸ ' : '  '}${tone.name} - ${tone.description}`;
            return (
              <Text key={tone.id}>
                <Text color={theme.colors.primary}>▊</Text>
                <Text backgroundColor={theme.colors.inputBackground}>
                  <Text color={index === selectedToneIndex ? theme.colors.primary : theme.colors.textDim} backgroundColor={theme.colors.inputBackground}>
                    {' '}{index === selectedToneIndex ? '▸ ' : '  '}{tone.name}
                  </Text>
                  <Text color={theme.colors.muted} backgroundColor={theme.colors.inputBackground}>
                    {' - '}{tone.description}
                  </Text>
                  {' '.repeat(Math.max(0, availableWidth - text.length - 1))}
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
              {' '}↑↓ navigate • Enter confirm • Esc back{' '.repeat(Math.max(0, availableWidth - '↑↓ navigate • Enter confirm • Esc back'.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
        </Box>
      )}

      {/* Generating state */}
      {state.type === 'generating' && (
        <Box flexDirection="column" marginTop={1} flexGrow={1}>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.primary}>
              {' '}<Spinner type="dots" /> Refining your text...{' '.repeat(Math.max(0, availableWidth - 'Refining your text...'.length - 4))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
        </Box>
      )}

      {/* Theme selector */}
      {state.type === 'theme-select' && (
        <Box flexDirection="column" marginTop={1} flexGrow={1}>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.primary} bold>
              {' '}Select Theme (live preview){' '.repeat(Math.max(0, availableWidth - 'Select Theme (live preview)'.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>

          {themes.map((t, index) => {
            const text = `${index === selectedThemeIndex ? '▸ ' : '  '}${t.name} - ${t.description}`;
            return (
              <Text key={t.name}>
                <Text color={theme.colors.primary}>▊</Text>
                <Text backgroundColor={theme.colors.inputBackground}>
                  <Text color={index === selectedThemeIndex ? t.colors.primary : theme.colors.textDim} backgroundColor={theme.colors.inputBackground}>
                    {' '}{index === selectedThemeIndex ? '▸ ' : '  '}{t.name}
                  </Text>
                  <Text color={theme.colors.muted} backgroundColor={theme.colors.inputBackground}>
                    {' - '}{t.description}
                  </Text>
                  {' '.repeat(Math.max(0, availableWidth - text.length - 1))}
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
              {' '}↑↓ preview theme • Enter confirm • Esc cancel{' '.repeat(Math.max(0, availableWidth - '↑↓ preview theme • Enter confirm • Esc cancel'.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.primary}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
        </Box>
      )}

      {/* Error display */}
      {state.type === 'error' && (
        <Box flexDirection="column" marginTop={1} flexGrow={1}>
          <Text>
            <Text color={theme.colors.error}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          <Text>
            <Text color={theme.colors.error}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.error}>
              {' '}Error: {state.message}{' '.repeat(Math.max(0, availableWidth - `Error: ${state.message}`.length - 2))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.colors.error}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
        </Box>
      )}

      {/* Output display */}
      {state.type === 'output' && (
        <Box flexDirection="column" marginTop={1} flexGrow={1}>
          <Text>
            <Text color={theme.colors.success}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          {state.refined.split('\n').map((line, index) => (
            <Text key={index}>
              <Text color={theme.colors.success}>▊</Text>
              <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.success}>
                {' '}{line}{' '.repeat(Math.max(0, availableWidth - line.length - 2))}
              </Text>
            </Text>
          ))}
          <Text>
            <Text color={theme.colors.success}>▊</Text>
            <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
          </Text>
          
          {copied && (
            <>
              <Text>
                <Text color={theme.colors.success}>▊</Text>
                <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
              </Text>
              <Text>
                <Text color={theme.colors.success}>▊</Text>
                <Text backgroundColor={theme.colors.inputBackground} color={theme.colors.muted}>
                  {' '}Copied to clipboard{' '.repeat(Math.max(0, availableWidth - 'Copied to clipboard'.length - 2))}
                </Text>
              </Text>
              <Text>
                <Text color={theme.colors.success}>▊</Text>
                <Text backgroundColor={theme.colors.inputBackground}>{' '.repeat(availableWidth)}</Text>
              </Text>
            </>
          )}
        </Box>
      )}

      {/* Footer hints */}
      {state.type === 'input' && (
        <Footer 
          theme={theme}
          keyHints={[
            { key: 'enter', label: 'continue' },
            { key: '/settings', label: 'settings' },
            { key: '/theme', label: 'theme' }
          ]}
        />
      )}
      {state.type === 'output' && (
        <Footer 
          theme={theme}
          keyHints={[
            { key: 'C', label: 'copy' },
            { key: 'N', label: 'new' },
            { key: 'Esc', label: 'exit' }
          ]}
        />
      )}
    </Box>
  );
};