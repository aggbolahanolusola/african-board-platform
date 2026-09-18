import { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface RecordingFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

const SUPPORTED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'video/mp4', 'audio/webm'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

/**
 * Component for uploading meeting recordings
 */
export const RecordingUpload = ({ meetingId }: { meetingId: number }) => {
  const [recordings, setRecordings] = useState<RecordingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { cacheData } = useOfflineSync();

  // Transcription will be handled by the server after upload

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    const validFiles: RecordingFile[] = [];

    for (const file of files) {
      // Validate file format
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        console.error(`[RecordingUpload] Unsupported format: ${file.type}`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        console.error(`[RecordingUpload] File too large: ${file.size}`);
        continue;
      }

      validFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: 'pending',
      });
    }

    setRecordings((prev) => [...prev, ...validFiles]);

    // Start uploading
    validFiles.forEach((recording) => {
      uploadRecording(recording);
    });
  };

  const uploadRecording = async (recording: RecordingFile) => {
    try {
      setRecordings((prev) =>
        prev.map((r) =>
          r.id === recording.id ? { ...r, status: 'uploading', progress: 10 } : r
        )
      );

      // Simulate progress
      const progressInterval = setInterval(() => {
        setRecordings((prev) =>
          prev.map((r) => {
            if (r.id === recording.id && r.progress < 90) {
              return { ...r, progress: r.progress + Math.random() * 20 };
            }
            return r;
          })
        );
      }, 500);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', recording.file);
      formData.append('meetingId', meetingId.toString());

      // Upload file
      const response = await fetch('/api/transcription/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Cache the recording data
      await cacheData(`recording-${data.recordingId}`, data);

      setRecordings((prev) =>
        prev.map((r) =>
          r.id === recording.id
            ? { ...r, status: 'processing', progress: 100 }
            : r
        )
      );

      // Transcription starts automatically on the server

      setRecordings((prev) =>
        prev.map((r) =>
          r.id === recording.id ? { ...r, status: 'complete' } : r
        )
      );
    } catch (error) {
      console.error('[RecordingUpload] Upload failed:', error);

      setRecordings((prev) =>
        prev.map((r) =>
          r.id === recording.id
            ? {
                ...r,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : r
        )
      );
    }
  };

  const removeRecording = (id: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  const retryUpload = (id: string) => {
    const recording = recordings.find((r) => r.id === id);
    if (recording) {
      uploadRecording(recording);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Upload className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Transcribing...';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-teal-500 bg-teal-50'
            : 'border-gray-300 bg-gray-50 hover:border-teal-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Upload Meeting Recording
        </h3>

        <p className="text-sm text-gray-600 mb-4">
          Drag and drop your recording here, or click to select
        </p>

        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="mb-2"
        >
          Select File
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_FORMATS.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />

        <p className="text-xs text-gray-500 mt-4">
          Supported formats: MP3, WAV, MP4, WebM (Max 500MB)
        </p>
      </div>

      {/* Recording List */}
      {recordings.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Uploads</h4>

          {recordings.map((recording) => (
            <div
              key={recording.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(recording.status)}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {recording.file.name}
                    </p>

                    <p className="text-sm text-gray-600">
                      {(recording.file.size / 1024 / 1024).toFixed(2)} MB •{' '}
                      {getStatusText(recording.status)}
                    </p>

                    {recording.error && (
                      <p className="text-sm text-red-600 mt-1">
                        {recording.error}
                      </p>
                    )}
                  </div>
                </div>

                {recording.status !== 'uploading' &&
                  recording.status !== 'processing' && (
                    <button
                      onClick={() => removeRecording(recording.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
              </div>

              {/* Progress Bar */}
              {(recording.status === 'uploading' ||
                recording.status === 'processing') && (
                <div className="space-y-1">
                  <Progress value={recording.progress} className="h-2" />
                  <p className="text-xs text-gray-600">
                    {Math.round(recording.progress)}%
                  </p>
                </div>
              )}

              {/* Retry Button */}
              {recording.status === 'error' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => retryUpload(recording.id)}
                  className="w-full"
                >
                  Retry Upload
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecordingUpload;
