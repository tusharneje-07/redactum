import React from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import type { Theme } from '../utils/themes.js';

interface GeneratingViewProps {
  theme: Theme;
  tone: string;
}

export const GeneratingView: React.FC<GeneratingViewProps> = ({ theme, tone }) => {
  useInput(() => {
    // Block input during generation
  });

  return (
    <Box flexDirection="column" width="100%">
      <Box marginBottom={1}>
        <Text color={theme.colors.primary}>
          <Spinner type="dots" />
        </Text>
        <Text color={theme.colors.text}> Refining your text...</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.colors.muted}>Applying tone: </Text>
        <Text color={theme.colors.accent}>{tone}</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.colors.textDim}>
          This may take a few seconds depending on the text length.
        </Text>
      </Box>
    </Box>
  );
};