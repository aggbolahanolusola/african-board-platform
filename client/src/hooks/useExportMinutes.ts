import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export type ExportFormat = 'text' | 'html' | 'pdf';

interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  status: 'open' | 'inProgress' | 'completed';
}

interface ExportMinutesInput {
  title: string;
  date: string;
  attendees: string[];
  content: string;
  actionItems: ActionItem[];
  speakers?: Array<{
    name: string;
    speakTime: number;
  }>;
}

/**
 * Hook for exporting meeting minutes in different formats
 * Handles API calls and file downloads
 */
export const useExportMinutes = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportTextMutation = trpc.export.exportMinutesText.useMutation();
  const exportHTMLMutation = trpc.export.exportMinutesHTML.useMutation();

  /**
   * Trigger file download in browser
   */
  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string
  ) => {
    try {
      // Decode base64 if needed
      let data: BlobPart;

      if (mimeType === 'text/plain' || mimeType === 'text/html') {
        data = content;
      } else {
        // For binary content, decode from base64
        const binaryString = atob(content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        data = bytes;
      }

      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      throw new Error('Failed to download file');
    }
  };

  /**
   * Export minutes in the specified format
   */
  const exportMinutes = async (
    format: ExportFormat,
    minutesData: ExportMinutesInput
  ) => {
    try {
      setIsExporting(true);
      setError(null);

      let result;

      if (format === 'text') {
        result = await exportTextMutation.mutateAsync(minutesData);
      } else if (format === 'html') {
        result = await exportHTMLMutation.mutateAsync(minutesData);
      } else if (format === 'pdf') {
        // For PDF, we use HTML export and let the browser handle PDF conversion
        result = await exportHTMLMutation.mutateAsync(minutesData);
        // Modify filename for PDF
        result.filename = result.filename.replace('.html', '.pdf');
      }

      if (result && result.buffer && result.filename) {
        // Determine MIME type from filename
        const mimeType = result.filename.endsWith('.html')
          ? 'text/html'
          : result.filename.endsWith('.pdf')
            ? 'application/pdf'
            : 'text/plain';
        downloadFile(result.buffer, result.filename, mimeType);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      console.error('Export error:', err);
      throw err;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportMinutes,
    isExporting,
    error,
    setError,
  };
};
