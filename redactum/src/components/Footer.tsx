import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../utils/themes.js';

interface FooterProps {
  theme: Theme;
  keyHints?: Array<{ key: string; label: string }>;
}

export const Footer: React.FC<FooterProps> = ({ theme, keyHints }) => {
  return (
    <Box 
      flexDirection="row" 
      justifyContent="flex-end"
      marginTop={1}
    >
      <Box flexDirection="row">
        {keyHints?.map((hint, index) => (
          <React.Fragment key={index}>
            {index > 0 && <Text color={theme.colors.muted}>  </Text>}
            <Text color={theme.colors.primary}>{hint.key}</Text>
            <Text color={theme.colors.muted}> {hint.label}</Text>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};