import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface VerificationPendingProps {
  email?: string;
  userName?: string;
}

export default function VerificationPending({ email = "", userName = "" }: VerificationPendingProps) {
  const [, navigate] = useLocation();
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  const resendMutation = trpc.auth.resendVerificationEmail.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setResendMessage("Verification email has been sent. Please check your inbox.");
        setResendError("");
      } else {
        setResendError(data.message);
        setResendMessage("");
      }
    },
    onError: (error) => {
      setResendError(error.message || "Failed to resend verification email");
      setResendMessage("");
    },
  });

  const handleResendEmail = () => {
    if (!email) {
      setResendError("Email address not available");
      return;
    }

    const baseUrl = window.location.origin;
    resendMutation.mutate({
      email,
      userName,
      baseUrl,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="w-12 h-12 text-primary" />
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a confirmation link to your email
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Email sent to:</strong> {email}
            </p>
            <p className="text-sm text-blue-800 mt-2">
              Please check your email and click the verification link to activate your account.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Link expires in 24 hours</p>
                <p className="text-xs mt-1">
                  Make sure to verify your email within 24 hours. After that, you'll need to request a new link.
                </p>
              </div>
            </div>
          </div>

          {resendMessage && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                {resendMessage}
              </AlertDescription>
            </Alert>
          )}

          {resendError && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                {resendError}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleResendEmail}
              disabled={resendMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {resendMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>

            <Button
              onClick={() => navigate("/login")}
              variant="ghost"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Didn't receive the email? Check your spam folder or{" "}
            <button
              onClick={handleResendEmail}
              className="text-primary hover:underline font-medium"
              disabled={resendMutation.isPending}
            >
              request a new link
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
