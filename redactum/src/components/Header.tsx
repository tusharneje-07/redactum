import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../utils/themes.js';

interface HeaderProps {
  theme: Theme;
  activeProvider?: string;
  model?: string;
}

export const Header: React.FC<HeaderProps> = ({ theme, activeProvider, model }) => {
  return (
    <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
      <Text bold color={theme.colors.primary}>Redactum</Text>
      {activeProvider && (
        <Box flexDirection="row">
          <Text color={theme.colors.muted}>{activeProvider}</Text>
          {model && (
            <Text color={theme.colors.muted}> ({model})</Text>
          )}
        </Box>
      )}
    </Box>
  );
};