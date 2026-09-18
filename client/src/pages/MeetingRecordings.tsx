import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { RecordingUpload } from '@/components/RecordingUpload';
import { TranscriptionProgress } from '@/components/TranscriptionProgress';
import { MinutesPreview } from '@/components/MinutesPreview';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';

interface Recording {
  id: number;
  meetingId: number;
  filename: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  speakers: Array<{
    id: string;
    name: string;
    color: string;
    speakTime: number;
  }>;
  actionItems: string[];
  minutesContent: string;
  minutesStatus: 'draft' | 'pending_approval' | 'approved';
  createdAt: string;
}

/**
 * Page for managing meeting recordings and transcriptions
 */
export default function MeetingRecordings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(
    null
  );

  if (!user) {
    setLocation('/');
    return null;
  }

  const handleRecordingUpload = (meetingId: number) => {
    // Recording will be added to the list after upload
    console.log('[MeetingRecordings] Recording uploaded for meeting:', meetingId);
  };

  const handleApproveMinutes = (recordingId: number) => {
    setRecordings((prev) =>
      prev.map((r) =>
        r.id === recordingId
          ? { ...r, minutesStatus: 'approved' }
          : r
      )
    );
  };

  const handleRejectMinutes = (recordingId: number) => {
    setRecordings((prev) =>
      prev.map((r) =>
        r.id === recordingId
          ? { ...r, minutesStatus: 'draft' }
          : r
      )
    );
  };

  const handleEditMinutes = (recordingId: number, content: string) => {
    setRecordings((prev) =>
      prev.map((r) =>
        r.id === recordingId
          ? { ...r, minutesContent: content }
          : r
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Meeting Recordings
          </h1>

          <p className="text-gray-600 mt-2">
            Upload meeting recordings to automatically generate transcripts and
            minutes
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload Recording</TabsTrigger>
            <TabsTrigger value="processing">
              Processing ({recordings.filter((r) => r.status === 'processing').length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({recordings.filter((r) => r.status === 'complete').length})
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Upload New Recording
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Select Meeting
                </label>

                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>Select a meeting...</option>
                  <option value="1">Board Meeting - Jan 20, 2026</option>
                  <option value="2">Committee Meeting - Jan 19, 2026</option>
                  <option value="3">Annual General Meeting - Jan 15, 2026</option>
                </select>
              </div>

              <RecordingUpload meetingId={1} />
            </Card>

            {/* Upload Tips */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">
                💡 Tips for Best Results
              </h3>

              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use high-quality audio recordings for better accuracy</li>
                <li>• Ensure speakers identify themselves at the start</li>
                <li>• Minimize background noise for clearer transcription</li>
                <li>• Supported formats: MP3, WAV, MP4, WebM (Max 500MB)</li>
              </ul>
            </Card>
          </TabsContent>

          {/* Processing Tab */}
          <TabsContent value="processing" className="space-y-4">
            {recordings.filter((r) => r.status === 'processing').length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-600">
                  No recordings currently being processed
                </p>
              </Card>
            ) : (
              recordings
                .filter((r) => r.status === 'processing')
                .map((recording) => (
                  <Card
                    key={recording.id}
                    className="p-6 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedRecording(recording)}
                  >
                    <h3 className="font-semibold text-gray-900">
                      {recording.filename}
                    </h3>

                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(recording.createdAt).toLocaleDateString()}
                    </p>

                    <div className="mt-4">
                      <TranscriptionProgress
                        recordingId={recording.id}
                        status={recording.status}
                        progress={recording.progress}
                        speakers={recording.speakers}
                        actionItems={recording.actionItems}
                      />
                    </div>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="space-y-4">
            {recordings.filter((r) => r.status === 'complete').length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-600">
                  No completed recordings yet
                </p>
              </Card>
            ) : (
              recordings
                .filter((r) => r.status === 'complete')
                .map((recording) => (
                  <Card
                    key={recording.id}
                    className="p-6 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedRecording(recording)}
                  >
                    <h3 className="font-semibold text-gray-900">
                      {recording.filename}
                    </h3>

                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(recording.createdAt).toLocaleDateString()} •{' '}
                      {recording.speakers.length} speakers identified
                    </p>
                  </Card>
                ))
            )}
          </TabsContent>
        </Tabs>

        {/* Minutes Preview Modal */}
        {selectedRecording && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {selectedRecording.filename}
                </h2>

                <button
                  onClick={() => setSelectedRecording(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                <MinutesPreview
                  meetingId={selectedRecording.meetingId}
                  title={selectedRecording.filename}
                  date={selectedRecording.createdAt}
                  attendees={selectedRecording.speakers.map((s) => s.name)}
                  content={selectedRecording.minutesContent}
                  actionItems={selectedRecording.actionItems.map((item, index) => ({
                    id: `${index}`,
                    description: item,
                    status: 'open',
                  }))}
                  status={selectedRecording.minutesStatus}
                  onApprove={() =>
                    handleApproveMinutes(selectedRecording.id)
                  }
                  onReject={() => handleRejectMinutes(selectedRecording.id)}
                  onEdit={(content) =>
                    handleEditMinutes(selectedRecording.id, content)
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
