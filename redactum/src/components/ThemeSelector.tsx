import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { Theme } from '../utils/themes.js';
import { themes, getTheme } from '../utils/themes.js';
import { loadSettings, saveSettings } from '../utils/settings.js';

interface ThemeSelectorProps {
  currentTheme: Theme;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  selectedIndex,
  onSelect,
  onConfirm,
  onCancel,
}) => {
  useInput((_, key) => {
    if (key.escape) {
      // Revert to original theme
      const settings = loadSettings();
      const originalTheme = getTheme(settings.theme);
      // We need to handle theme revert in parent
      onCancel();
      return;
    }

    if (key.upArrow) {
      const newIndex = Math.max(0, selectedIndex - 1);
      onSelect(newIndex);
    } else if (key.downArrow) {
      const newIndex = Math.min(themes.length - 1, selectedIndex + 1);
      onSelect(newIndex);
    } else if (key.return) {
      // Save theme
      const settings = loadSettings();
      const newSettings = { ...settings, theme: themes[selectedIndex].name };
      saveSettings(newSettings);
      onConfirm();
    }
  });

  return (
    <Box flexDirection="column" width="100%">
      <Box marginBottom={1}>
        <Text bold color={currentTheme.colors.primary}>Select Theme</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color={currentTheme.colors.textDim}>
          Preview and select a color theme:
        </Text>
      </Box>

      <Box flexDirection="column">
        {themes.map((theme, index) => (
          <Box 
            key={theme.name}
            paddingY={1}
            paddingX={1}
            borderStyle={selectedIndex === index ? "single" : undefined}
            borderColor={selectedIndex === index ? currentTheme.colors.primary : undefined}
          >
            <Text>
              {selectedIndex === index ? (
                <Text color={currentTheme.colors.primary} bold>▸ </Text>
              ) : (
                '  '
              )}
              <Text 
                color={selectedIndex === index ? currentTheme.colors.text : currentTheme.colors.textDim}
                bold={selectedIndex === index}
              >
                {theme.name}
              </Text>
            </Text>
            <Box marginLeft={4}>
              <Text color={selectedIndex === index ? currentTheme.colors.textDim : currentTheme.colors.muted}>
                {theme.description}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color={currentTheme.colors.muted}>↑↓ preview • Enter confirm • Esc cancel</Text>
      </Box>
    </Box>
  );
}