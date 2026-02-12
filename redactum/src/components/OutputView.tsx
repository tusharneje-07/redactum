import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import type { Theme } from '../utils/themes.js';
import type { ToneType } from '../utils/tones.js';
import { copyToClipboard } from '../utils/clipboard.js';

interface OutputViewProps {
  theme: Theme;
  originalText: string;
  refinedText: string;
  tone: ToneType;
  onNew: () => void;
  onRetry: () => void;
}

export const OutputView: React.FC<OutputViewProps> = ({
  theme,
  originalText,
  refinedText,
  tone,
  onNew,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);

  useInput((input, key) => {
    if (key.escape) {
      onNew();
      return;
    }

    if (input === 'c' || input === 'C') {
      copyToClipboard(refinedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (input === 'r' || input === 'R') {
      onRetry();
    } else if (input === 'n' || input === 'N') {
      onNew();
    }
  });

  return (
    <Box flexDirection="column" width="100%">
      <Box marginBottom={1}>
        <Text bold color={theme.colors.success}>✓ Refined Text</Text>
        <Text color={theme.colors.muted}> | Tone: </Text>
        <Text color={theme.colors.accent}>{tone}</Text>
      </Box>

      <Box 
        width="100%"
        borderStyle="single"
        borderColor={theme.colors.border}
        paddingX={1}
        paddingY={1}
      >
        <Text color={theme.colors.text} wrap="wrap">
          {refinedText}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.colors.muted}>
          {refinedText.length} characters | 
          Original: {originalText.length} characters
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.colors.accent} bold>C</Text>
        <Text color={theme.colors.textDim}> copy • </Text>
        <Text color={theme.colors.accent} bold>R</Text>
        <Text color={theme.colors.textDim}> retry • </Text>
        <Text color={theme.colors.accent} bold>N</Text>
        <Text color={theme.colors.textDim}> new • </Text>
        <Text color={theme.colors.accent} bold>Esc</Text>
        <Text color={theme.colors.textDim}> exit</Text>
      </Box>

      {copied && (
        <Box marginTop={1}>
          <Text color={theme.colors.success}>✓ Copied to clipboard!</Text>
        </Box>
      )}
    </Box>
  );
};