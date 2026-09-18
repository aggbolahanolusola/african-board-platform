import { useState } from 'react';
import {
  Download,
  FileText,
  Eye,
  EyeOff,
  Loader,
  AlertCircle,
  CheckCircle,
  Copy,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { EmailDialog } from './EmailDialog';
import { trpc } from '@/lib/trpc';

export type ExportFormat = 'text' | 'html' | 'pdf';

interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  status: 'open' | 'inProgress' | 'completed';
}

interface ExportMinutesProps {
  meetingId: number;
  title: string;
  date: string;
  attendees: string[];
  content: string;
  actionItems: ActionItem[];
  speakers?: Array<{
    name: string;
    speakTime: number;
  }>;
  onExport?: (format: ExportFormat) => Promise<void>;
}

/**
 * Component for exporting meeting minutes in multiple formats
 * with format selection, preview, and one-click download
 */
export const ExportMinutes = ({
  meetingId,
  title,
  date,
  attendees,
  content,
  actionItems,
  speakers,
  onExport,
}: ExportMinutesProps) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('html');
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const { copy, isCopied } = useCopyToClipboard();
  const sendEmailMutation = trpc.export.email.sendMinutesEmail.useMutation();

  const formatLabels: Record<ExportFormat, string> = {
    text: 'Plain Text (.txt)',
    html: 'HTML (.html)',
    pdf: 'PDF (.pdf)',
  };

  const formatDescriptions: Record<ExportFormat, string> = {
    text: 'Simple text format, suitable for email and archiving',
    html: 'Formatted HTML with styling, best for web viewing',
    pdf: 'Professional PDF document, ready for printing and sharing',
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      setExportSuccess(false);

      if (onExport) {
        await onExport(selectedFormat);
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Export failed';
      setExportError(errorMessage);
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    const preview = generatePreview();
    const success = await copy(preview);
    if (!success) {
      setExportError('Failed to copy to clipboard');
    }
  };

  const handleSendEmail = async (recipients: Array<{ email: string; name: string }>) => {
    try {
      await sendEmailMutation.mutateAsync({
        minutes: {
          title,
          date,
          attendees,
          content,
          actionItems: actionItems.map((item) => ({
            description: item.description,
            assignee: item.assignee,
            dueDate: item.dueDate,
            status: item.status,
          })),
          speakers,
        },
        recipients,
        senderName: 'NurtGov User',
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send email';
      throw new Error(errorMessage);
    }
  };

  const generatePreview = (): string => {
    const dateStr = new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const attendeesList = attendees.join(', ');
    const actionItemsText = actionItems
      .map(
        (item) =>
          `• ${item.description}${item.assignee ? ` (Assigned to: ${item.assignee})` : ''}${item.dueDate ? ` - Due: ${new Date(item.dueDate).toLocaleDateString()}` : ''}`
      )
      .join('\n');

    return `MEETING MINUTES
================

Title: ${title}
Date: ${dateStr}
Meeting ID: ${meetingId}

Attendees: ${attendeesList}

CONTENT
-------
${content}

${actionItemsText ? `ACTION ITEMS\n-----------\n${actionItemsText}` : ''}`;
  };

  const preview = generatePreview();

  return (
    <div className="space-y-4 border-t pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-teal-600" />
            Export Meeting Minutes
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Download minutes in your preferred format
          </p>
        </div>
      </div>

      {/* Format Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['text', 'html', 'pdf'] as ExportFormat[]).map((format) => (
          <div
            key={format}
            className={`p-3 border rounded-lg cursor-pointer transition-all ${
              selectedFormat === format
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedFormat(format)}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="export-format"
                value={format}
                checked={selectedFormat === format}
                onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                className="mt-1"
              />
              <div className="flex-1">
                <label className="font-medium text-sm text-gray-900 cursor-pointer">
                  {formatLabels[format]}
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  {formatDescriptions[format]}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error Alert */}
      {exportError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {exportSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Minutes exported successfully and downloaded!
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Toggle and Export Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={() => setShowPreview(!showPreview)}
          className="flex-1 sm:flex-none"
        >
          {showPreview ? (
            <>
              <EyeOff className="w-4 h-4 mr-2" />
              Hide Preview
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Show Preview
            </>
          )}
        </Button>

        <Button
          onClick={handleCopyToClipboard}
          disabled={isExporting}
          variant="outline"
          className="flex-1 sm:flex-none"
        >
          {isCopied ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </>
          )}
        </Button>

        <EmailDialog
          meetingTitle={title}
          onSendEmail={handleSendEmail}
        />

        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="flex-1 sm:flex-none bg-teal-600 hover:bg-teal-700"
        >
          {isExporting ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download as {formatLabels[selectedFormat].split(' ')[0]}
            </>
          )}
        </Button>
      </div>

      {/* Preview Section */}
      {showPreview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 text-sm">
              Preview ({formatLabels[selectedFormat]})
            </h4>
            <Badge variant="outline" className="text-xs">
              {preview.length} characters
            </Badge>
          </div>

          <div className="bg-gray-50 border rounded-lg p-4 max-h-96 overflow-y-auto">
            {selectedFormat === 'text' ? (
              <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-words">
                {preview}
              </pre>
            ) : selectedFormat === 'html' ? (
              <div className="text-sm text-gray-700 space-y-3">
                <div className="font-bold text-lg">{title}</div>
                <div className="text-xs text-gray-600">
                  <div>Date: {new Date(date).toLocaleDateString()}</div>
                  <div>Meeting ID: {meetingId}</div>
                  <div>Attendees: {attendees.join(', ')}</div>
                </div>
                <div className="border-t pt-3 text-sm">{content}</div>
                {actionItems.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="font-semibold mb-2">Action Items:</div>
                    <ul className="space-y-1 text-xs">
                      {actionItems.map((item) => (
                        <li key={item.id} className="list-disc list-inside">
                          {item.description}
                          {item.assignee && ` (${item.assignee})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-700 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  <span className="font-semibold">PDF Preview</span>
                </div>
                <p className="text-xs text-gray-600">
                  PDF will include professional formatting with:
                </p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>Meeting header with title, date, and ID</li>
                  <li>Attendee list</li>
                  <li>Full meeting content</li>
                  <li>Action items with assignments and due dates</li>
                  <li>Professional styling and page layout</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Format Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">Tip:</span> Choose HTML for web viewing
          with full formatting, PDF for professional documents, or Text for
          simple archiving.
        </p>
      </div>
    </div>
  );
};

export default ExportMinutes;
