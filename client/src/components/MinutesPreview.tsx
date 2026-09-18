import { useState } from 'react';
import { CheckCircle, AlertCircle, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Streamdown } from 'streamdown';
import { ExportMinutes, type ExportFormat } from './ExportMinutes';
import { useExportMinutes } from '@/hooks/useExportMinutes';

interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  status: 'open' | 'inProgress' | 'completed';
}

interface MinutesPreviewProps {
  meetingId: number;
  title: string;
  date: string;
  attendees: string[];
  content: string;
  actionItems: ActionItem[];
  status: 'draft' | 'pending_approval' | 'approved';
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: (content: string) => void;
  speakers?: Array<{
    name: string;
    speakTime: number;
  }>;
}

/**
 * Component to preview and approve meeting minutes
 */
export const MinutesPreview = ({
  meetingId,
  title,
  date,
  attendees,
  content,
  actionItems,
  status,
  onApprove,
  onReject,
  onEdit,
  speakers,
}: MinutesPreviewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const { exportMinutes } = useExportMinutes();

  const handleSave = () => {
    onEdit?.(editedContent);
    setIsEditing(false);
  };

  const getStatusColor = (itemStatus: string) => {
    switch (itemStatus) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'inProgress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (itemStatus: string) => {
    switch (itemStatus) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'inProgress':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>

            <p className="text-sm text-gray-600 mt-1">
              Meeting ID: {meetingId} • {new Date(date).toLocaleDateString()}
            </p>
          </div>

          <Badge
            variant={
              status === 'approved'
                ? 'default'
                : status === 'pending_approval'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {status === 'approved'
              ? 'Approved'
              : status === 'pending_approval'
                ? 'Pending Approval'
                : 'Draft'}
          </Badge>
        </div>

        {/* Attendees */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Attendees
          </h4>

          <div className="flex flex-wrap gap-2">
            {attendees.map((attendee, index) => (
              <Badge key={index} variant="outline">
                {attendee}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Meeting Minutes</h3>

          {status === 'draft' && (
            <Button
              size="sm"
              variant={isEditing ? 'default' : 'outline'}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Done Editing
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
          )}
        </div>

        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-96 p-4 border rounded-lg font-mono text-sm"
            placeholder="Edit meeting minutes..."
          />
        ) : (
          <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-6 border">
            <Streamdown>{content}</Streamdown>
          </div>
        )}
      </div>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Action Items</h3>

          <div className="space-y-3">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg p-4 border ${getStatusColor(item.status)}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(item.status)}

                  <div className="flex-1">
                    <p className="font-medium">{item.description}</p>

                    <div className="mt-2 flex items-center gap-4 text-sm">
                      {item.assignee && (
                        <span>Assignee: {item.assignee}</span>
                      )}

                      {item.dueDate && (
                        <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {status !== 'approved' && (
        <div className="flex gap-3 pt-4 border-t">
          {isEditing ? (
            <>
              <Button onClick={handleSave} className="flex-1">
                Save Changes
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setEditedContent(content);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {status === 'pending_approval' && (
                <>
                  <Button onClick={onApprove} className="flex-1">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Minutes
                  </Button>

                  <Button
                    variant="outline"
                    onClick={onReject}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}

              {status === 'draft' && (
                <Button onClick={onApprove} className="flex-1">
                  Submit for Approval
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Approved Message */}
      {status === 'approved' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />

          <p className="text-sm text-green-800 font-medium">
            These minutes have been approved and are now part of the official
            record.
          </p>
        </div>
      )}

      {/* Export Section */}
      <ExportMinutes
        meetingId={meetingId}
        title={title}
        date={date}
        attendees={attendees}
        content={content}
        actionItems={actionItems}
        speakers={speakers}
        onExport={async (format: ExportFormat) => {
          await exportMinutes(format, {
            title,
            date,
            attendees,
            content,
            actionItems: actionItems.map((item) => ({
              id: item.id,
              description: item.description,
              assignee: item.assignee,
              dueDate: item.dueDate,
              status: item.status,
            })),
            speakers,
          });
        }}
      />
    </div>
  );
};

export default MinutesPreview;
