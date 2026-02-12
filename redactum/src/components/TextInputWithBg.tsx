import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';

interface TextInputWithBgProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  focus?: boolean;
  backgroundColor?: string;
  textColor?: string;
  placeholderColor?: string;
  borderColor?: string;
}

export const TextInputWithBg: React.FC<TextInputWithBgProps> = ({
  value,
  onChange,
  placeholder = '',
  focus = true,
  backgroundColor,
  textColor,
  placeholderColor,
  borderColor,
}) => {
  const { stdout } = useStdout();
  const [cursorOffset, setCursorOffset] = useState(value.length);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Get terminal width and calculate available width for text
  const termWidth = stdout?.columns || 80;
  const availableWidth = termWidth - 5; // outer paddingX (2*2=4) + left border (1)
  const textWidth = availableWidth - 2; // subtract 1 space padding on each side

  // Cursor blink effect
  useEffect(() => {
    if (!focus) return;
    const interval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 530);
    return () => clearInterval(interval);
  }, [focus]);

  // Reset cursor position when value is cleared
  useEffect(() => {
    if (value.length === 0) {
      setCursorOffset(0);
    }
  }, [value]);

  useInput((input, key) => {
    if (!focus) return;

    if (key.leftArrow) {
      setCursorOffset(Math.max(0, cursorOffset - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorOffset(Math.min(value.length, cursorOffset + 1));
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorOffset > 0) {
        const newValue = value.slice(0, cursorOffset - 1) + value.slice(cursorOffset);
        onChange(newValue);
        setCursorOffset(cursorOffset - 1);
      }
      return;
    }

    // Ignore control keys (but allow paste via terminal)
    if (key.ctrl || key.meta || key.escape || key.return || key.tab || key.upArrow || key.downArrow) {
      return;
    }

    // Add character(s) at cursor position - supports both typing and pasting
    if (input && input.length > 0) {
      const newValue = value.slice(0, cursorOffset) + input + value.slice(cursorOffset);
      onChange(newValue);
      setCursorOffset(cursorOffset + input.length);
    }
  }, { isActive: focus });

  const showPlaceholder = value.length === 0;
  const displayText = showPlaceholder ? placeholder : value;
  
  // Word wrap the text to fit within available width - breaks at word boundaries
  const wrapText = (text: string, maxWidth: number): string[] => {
    if (!text) return [''];
    const lines: string[] = [];
    const words = text.split(' ');
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? currentLine + ' ' + word : word;
      
      if (testLine.length <= maxWidth) {
        currentLine = testLine;
      } else {
        // If current line has content, push it
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is longer than maxWidth, break it by characters
          let remainingWord = word;
          while (remainingWord.length > maxWidth) {
            lines.push(remainingWord.slice(0, maxWidth));
            remainingWord = remainingWord.slice(maxWidth);
          }
          currentLine = remainingWord;
        }
      }
    }
    
    if (currentLine || lines.length === 0) {
      lines.push(currentLine);
    }
    
    return lines;
  };

  const wrappedLines = wrapText(displayText, textWidth);
  
  // Find which line the cursor is on
  // We need to map cursor position in original text to wrapped lines
  let cursorLine = 0;
  let cursorCol = cursorOffset;
  let charCount = 0;
  
  for (let i = 0; i < wrappedLines.length; i++) {
    const lineLength = wrappedLines[i].length;
    // Account for the space that will be added after this line (except last line)
    const lineWithSpace = i < wrappedLines.length - 1 ? lineLength + 1 : lineLength;
    
    if (charCount + lineWithSpace > cursorOffset) {
      cursorLine = i;
      cursorCol = cursorOffset - charCount;
      break;
    }
    charCount += lineWithSpace;
  }
  
  // Clamp cursor column to line length
  if (cursorCol > wrappedLines[cursorLine]?.length) {
    cursorCol = wrappedLines[cursorLine]?.length || 0;
  }

  const leftBorder = '▊';
  const emptyLine = ' '.repeat(availableWidth);

  return (
    <Box flexGrow={1} flexDirection="column">
      {/* Top padding line */}
      <Text>
        <Text color={borderColor}>{leftBorder}</Text>
        <Text backgroundColor={backgroundColor}>{emptyLine}</Text>
      </Text>
      
      {/* Text lines with wrapping */}
      {wrappedLines.map((line, lineIndex) => {
        const isCurrentLine = lineIndex === cursorLine;
        
        let displayLine = '';
        if (isCurrentLine) {
          const beforeCursor = line.slice(0, cursorCol);
          const cursorChar = cursorCol < line.length ? line[cursorCol] : ' ';
          const afterCursor = cursorCol < line.length ? line.slice(cursorCol + 1) : '';
          
          return (
            <Text key={lineIndex}>
              <Text color={borderColor}>{leftBorder}</Text>
              <Text backgroundColor={backgroundColor}>
                {' '}
                <Text color={showPlaceholder ? placeholderColor : textColor} backgroundColor={backgroundColor}>
                  {beforeCursor}
                </Text>
                {focus && cursorVisible ? (
                  <Text backgroundColor={textColor} color={backgroundColor}>
                    {cursorChar}
                  </Text>
                ) : (
                  <Text color={showPlaceholder ? placeholderColor : textColor} backgroundColor={backgroundColor}>
                    {cursorChar}
                  </Text>
                )}
                <Text color={showPlaceholder ? placeholderColor : textColor} backgroundColor={backgroundColor}>
                  {afterCursor}
                </Text>
                {' '.repeat(Math.max(0, availableWidth - line.length - 2))}
                {' '}
              </Text>
            </Text>
          );
        } else {
          return (
            <Text key={lineIndex}>
              <Text color={borderColor}>{leftBorder}</Text>
              <Text backgroundColor={backgroundColor}>
                {' '}
                <Text color={showPlaceholder ? placeholderColor : textColor} backgroundColor={backgroundColor}>
                  {line}
                </Text>
                {' '.repeat(Math.max(0, availableWidth - line.length - 2))}
                {' '}
              </Text>
            </Text>
          );
        }
      })}
      
      {/* Bottom padding line */}
      <Text>
        <Text color={borderColor}>{leftBorder}</Text>
        <Text backgroundColor={backgroundColor}>{emptyLine}</Text>
      </Text>
    </Box>
  );
};