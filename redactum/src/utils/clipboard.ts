import clipboardy from 'clipboardy';

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await clipboardy.write(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
  }
}