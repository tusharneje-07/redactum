import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { Theme } from '../utils/themes.js';
import { TONES, type ToneType } from '../utils/tones.js';

interface ToneSelectorProps {
  theme: Theme;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ToneSelector: React.FC<ToneSelectorProps> = ({
  theme,
  selectedIndex,
  onSelect,
  onConfirm,
  onCancel,
}) => {
  useInput((_, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      onSelect(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      onSelect(Math.min(TONES.length - 1, selectedIndex + 1));
    } else if (key.return) {
      onConfirm();
    }
  });

  const selectedTone = TONES[selectedIndex];

  return (
    <Box flexDirection="column" width="100%">
      <Box marginBottom={1}>
        <Text bold color={theme.colors.primary}>Select Tone</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color={theme.colors.textDim}>
          Choose the tone for your refined text:
        </Text>
      </Box>

      <Box flexDirection="column">
        {TONES.map((tone, index) => (
          <Box 
            key={tone.id}
            paddingY={1}
            paddingX={1}
            borderStyle={selectedIndex === index ? "single" : undefined}
            borderColor={selectedIndex === index ? theme.colors.primary : undefined}
          >
            <Text>
              {selectedIndex === index ? (
                <Text color={theme.colors.primary} bold>▸ </Text>
              ) : (
                '  '
              )}
              <Text 
                color={selectedIndex === index ? theme.colors.text : theme.colors.textDim}
                bold={selectedIndex === index}
              >
                {tone.name}
              </Text>
            </Text>
            <Box marginLeft={4}>
              <Text color={selectedIndex === index ? theme.colors.textDim : theme.colors.muted}>
                {tone.description}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>

      <Box marginTop={1} paddingX={1}>
        <Text color={theme.colors.accent} bold>Selected: </Text>
        <Text color={theme.colors.text}>{selectedTone.name}</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.colors.muted}>↑↓ navigate • Enter confirm • Esc back</Text>
      </Box>
    </Box>
  );
};