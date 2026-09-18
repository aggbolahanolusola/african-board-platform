import { AlertCircle, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatTimeRemaining } from '@/hooks/useSessionTimeout';

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

/**
 * Dialog component that warns user about impending session timeout
 * Shows time remaining and options to extend session or logout
 */
export function SessionTimeoutWarning({
  isOpen,
  timeRemaining,
  onExtend,
  onLogout,
}: SessionTimeoutWarningProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
            <DialogTitle>Session Timeout Warning</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Your session will expire due to inactivity. Please choose to extend your session or logout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Time Remaining Display */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-900">Time Remaining</span>
            </div>
            <div className="text-3xl font-bold text-yellow-700 font-mono">
              {formatTimeRemaining(timeRemaining)}
            </div>
            <p className="text-sm text-yellow-600 mt-2">
              You will be automatically logged out when time expires.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onExtend}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              Extend Session
            </Button>
            <Button
              onClick={onLogout}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Logout Now
            </Button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground text-center">
            Your session will be extended for 30 minutes from the time you click "Extend Session".
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
