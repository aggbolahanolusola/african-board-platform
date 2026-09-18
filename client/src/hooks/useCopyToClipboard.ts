import { useState, useCallback } from 'react';

interface UseCopyToClipboardOptions {
  timeout?: number;
}

interface UseCopyToClipboardReturn {
  copy: (text: string) => Promise<boolean>;
  isCopied: boolean;
  error: Error | null;
}

/**
 * Hook for copying text to clipboard with visual feedback
 */
export const useCopyToClipboard = (
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardReturn => {
  const { timeout = 2000 } = options;
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        setError(null);

        // Check if the Clipboard API is available
        if (!navigator.clipboard) {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          try {
            document.execCommand('copy');
            setIsCopied(true);

            setTimeout(() => {
              setIsCopied(false);
            }, timeout);

            document.body.removeChild(textArea);
            return true;
          } catch (err) {
            document.body.removeChild(textArea);
            throw new Error('Failed to copy text to clipboard');
          }
        }

        // Modern Clipboard API
        await navigator.clipboard.writeText(text);
        setIsCopied(true);

        setTimeout(() => {
          setIsCopied(false);
        }, timeout);

        return true;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to copy to clipboard');
        setError(error);
        console.error('Copy to clipboard error:', error);
        return false;
      }
    },
    [timeout]
  );

  return {
    copy,
    isCopied,
    error,
  };
};
