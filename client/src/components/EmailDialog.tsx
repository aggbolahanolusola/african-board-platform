import { useState } from 'react';
import {
  Mail,
  X,
  Loader,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';

interface EmailRecipient {
  email: string;
  name: string;
}

interface EmailDialogProps {
  meetingTitle: string;
  onSendEmail?: (recipients: EmailRecipient[]) => Promise<void>;
}

/**
 * Dialog component for sending meeting minutes via email
 */
export const EmailDialog = ({
  meetingTitle,
  onSendEmail,
}: EmailDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const getTeamMembersQuery = trpc.export.email.getTeamMembers.useQuery();
  const validateEmailsQuery = trpc.export.email.validateEmailAddresses.useQuery(
    { emails: [] },
    { enabled: false }
  );

  const handleAddRecipient = async () => {
    if (!newEmail || !newName) {
      setError('Please enter both email and name');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError(`Invalid email address: ${newEmail}`);
      return;
    }

    // Check for duplicates
    if (recipients.some((r) => r.email === newEmail)) {
      setError('This email is already added');
      return;
    }

    setRecipients([...recipients, { email: newEmail, name: newName }]);
    setNewEmail('');
    setNewName('');
    setError(null);
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r.email !== email));
  };

  const handleAddTeamMember = (member: {
    id: string;
    name: string;
    email: string;
    role: string;
  }) => {
    if (recipients.some((r) => r.email === member.email)) {
      setError(`${member.name} is already added`);
      return;
    }

    setRecipients([...recipients, { email: member.email, name: member.name }]);
    setError(null);
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      setError('Please add at least one recipient');
      return;
    }

    try {
      setIsSending(true);
      setError(null);

      if (onSendEmail) {
        await onSendEmail(recipients);
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setRecipients([]);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send email';
      setError(errorMessage);
      console.error('Email sending error:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="w-4 h-4 mr-2" />
          Send via Email
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Meeting Minutes via Email</DialogTitle>
          <DialogDescription>
            Send "{meetingTitle}" to team members or custom recipients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Email sent successfully to {recipients.length} recipient(s)!
              </AlertDescription>
            </Alert>
          )}

          {/* Add Recipient Section */}
          <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold text-sm text-gray-900">
              Add Recipients
            </h4>

            <div className="space-y-2">
              <Input
                placeholder="Recipient name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isSending}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Email address"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={isSending}
                />
                <Button
                  onClick={handleAddRecipient}
                  disabled={isSending || !newEmail || !newName}
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Team Members Quick Add */}
          {getTeamMembersQuery.data?.teamMembers &&
            getTeamMembersQuery.data.teamMembers.length > 0 && (
              <div className="space-y-3 border rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold text-sm text-gray-900">
                  Quick Add from Team
                </h4>

                <div className="space-y-2">
                  {getTeamMembersQuery.data.teamMembers.map((member) => {
                    const isAdded = recipients.some(
                      (r) => r.email === member.email
                    );

                    return (
                      <button
                        key={member.id}
                        onClick={() => !isAdded && handleAddTeamMember(member)}
                        disabled={isAdded || isSending}
                        className={`w-full text-left p-2 rounded border transition-colors ${
                          isAdded
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'hover:bg-white cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-gray-600">
                              {member.email}
                            </p>
                          </div>
                          {isAdded && (
                            <Badge variant="secondary" className="text-xs">
                              Added
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Recipients List */}
          {recipients.length > 0 && (
            <div className="space-y-3 border rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-900">
                Recipients ({recipients.length})
              </h4>

              <div className="space-y-2">
                {recipients.map((recipient) => (
                  <div
                    key={recipient.email}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                  >
                    <div>
                      <p className="text-sm font-medium">{recipient.name}</p>
                      <p className="text-xs text-gray-600">
                        {recipient.email}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveRecipient(recipient.email)}
                      disabled={isSending}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Send Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleSend}
              disabled={isSending || recipients.length === 0}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {isSending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>

            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              disabled={isSending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailDialog;
