import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setStatus("success");
        setMessage(data.message);
        setTimeout(() => {
          navigate("/");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.message);
      }
    },
    onError: (error) => {
      setStatus("error");
      setMessage(error.message || "Failed to verify email");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    // Verify the email
    verifyMutation.mutate({ token });
  }, [search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>Verifying your email address...</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Verifying your email...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{message}</AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                Redirecting to home page in 3 seconds...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{message}</AlertDescription>
              </Alert>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/")}
                >
                  Back to Home
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={() => navigate("/signup")}
                >
                  Sign Up Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
