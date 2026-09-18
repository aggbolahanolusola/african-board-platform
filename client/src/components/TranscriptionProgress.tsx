import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, Volume2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Speaker {
  id: string;
  name: string;
  color: string;
  speakTime: number;
}

interface TranscriptionProgressProps {
  recordingId: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress?: number;
  speakers?: Speaker[];
  actionItems?: string[];
  error?: string;
  onComplete?: () => void;
}

const COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-pink-100 text-pink-800',
  'bg-cyan-100 text-cyan-800',
];

/**
 * Component to display transcription progress and speaker information
 */
export const TranscriptionProgress = ({
  recordingId,
  status,
  progress = 0,
  speakers = [],
  actionItems = [],
  error,
  onComplete,
}: TranscriptionProgressProps) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Animate progress
  useEffect(() => {
    if (progress > displayProgress) {
      const timer = setTimeout(() => {
        setDisplayProgress(Math.min(displayProgress + 5, progress));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [progress, displayProgress]);

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      case 'processing':
        return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />;
      default:
        return <Volume2 className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Waiting to process...';
      case 'processing':
        return 'Transcribing meeting...';
      case 'complete':
        return 'Transcription complete';
      case 'error':
        return 'Transcription failed';
      default:
        return 'Unknown status';
    }
  };

  const getTotalSpeakTime = () => {
    return speakers.reduce((total, speaker) => total + speaker.speakTime, 0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center gap-4">
        {getStatusIcon()}

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{getStatusText()}</h3>

          {status === 'processing' && (
            <p className="text-sm text-gray-600">Recording ID: {recordingId}</p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {status === 'processing' && (
          <Badge variant="outline" className="animate-pulse">
            {displayProgress}%
          </Badge>
        )}
      </div>

      {/* Progress Bar */}
      {status === 'processing' && (
        <div className="space-y-2">
          <Progress value={displayProgress} className="h-2" />

          <div className="flex justify-between text-xs text-gray-600">
            <span>Processing audio</span>
            <span>{displayProgress}%</span>
          </div>
        </div>
      )}

      {/* Speakers Section */}
      {speakers.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Speakers Identified</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {speakers.map((speaker, index) => (
              <div
                key={speaker.id}
                className={`rounded-lg p-3 ${COLORS[index % COLORS.length]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{speaker.name}</span>

                  <span className="text-xs font-semibold">
                    {formatTime(speaker.speakTime)}
                  </span>
                </div>

                <div className="mt-2 bg-white bg-opacity-50 rounded h-1.5">
                  <div
                    className="h-full rounded bg-current opacity-75"
                    style={{
                      width: `${(speaker.speakTime / getTotalSpeakTime()) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-600">
            Total speaking time: {formatTime(getTotalSpeakTime())}
          </p>
        </div>
      )}

      {/* Action Items Section */}
      {actionItems.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">
            Action Items Extracted
          </h4>

          <ul className="space-y-2">
            {actionItems.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                  {index + 1}
                </span>

                <span className="text-sm text-gray-900">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Completion Message */}
      {status === 'complete' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-medium">
            ✓ Meeting transcription is ready for review. You can now view the
            minutes and approve them.
          </p>
        </div>
      )}

      {/* Error Message */}
      {status === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">
            ✗ {error || 'Transcription failed. Please try uploading again.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TranscriptionProgress;
