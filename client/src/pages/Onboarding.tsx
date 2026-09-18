import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState<"choose" | "create" | "join">("choose");

  // Redirect if already has organization
  if (isAuthenticated && user?.organizationId) {
    navigate("/dashboard");
    return null;
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  const createOrgMutation = trpc.organization.create.useMutation({
    onSuccess: () => {
      setSuccess("Organization created successfully! Redirecting to dashboard...");
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    },
    onError: (error: any) => {
      console.error("Organization creation error:", error);
      if (error.code === "UNAUTHORIZED") {
        setError("You must be logged in to create an organization");
      } else if (error.code === "BAD_REQUEST") {
        setError("Please provide a valid organization name");
      } else if (error.code === "INTERNAL_SERVER_ERROR") {
        setError("Failed to create organization. Please try again or contact support at support@afrigov.com");
      } else {
        setError(error.message || "Failed to create organization");
      }
    },
  });

  const handleCreateOrganization = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!organizationName.trim()) {
      setError("Please enter an organization name");
      return;
    }

    createOrgMutation.mutate({ name: organizationName });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display text-foreground mb-2">Welcome, {user?.name}!</h1>
          <p className="text-muted-foreground">Let's get your organization set up</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>Choose how you'd like to proceed</CardDescription>
          </CardHeader>
          <CardContent>
            {success && (
              <Alert className="mb-6 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="mb-6 bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {step === "choose" && (
              <div className="space-y-4">
                <Button
                  onClick={() => setStep("create")}
                  className="w-full h-auto py-4 flex flex-col items-center justify-center gap-2"
                  variant="outline"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-semibold">Create New Organization</span>
                  <span className="text-xs text-muted-foreground">Start fresh with your own board</span>
                </Button>

                <Button
                  onClick={() => setStep("join")}
                  className="w-full h-auto py-4 flex flex-col items-center justify-center gap-2"
                  variant="outline"
                >
                  <span className="text-lg">👥</span>
                  <span className="font-semibold">Join Existing Organization</span>
                  <span className="text-xs text-muted-foreground">Get invited by an administrator</span>
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  onClick={() => navigate("/profile")}
                  className="w-full"
                  variant="ghost"
                >
                  View Profile Settings
                </Button>
              </div>
            )}

            {step === "create" && (
              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="orgName" className="text-sm font-medium">
                    Organization Name
                  </label>
                  <Input
                    id="orgName"
                    placeholder="e.g., Board of Directors"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    disabled={createOrgMutation.isPending}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the name of your board or governance organization
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("choose")}
                    disabled={createOrgMutation.isPending}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createOrgMutation.isPending}
                  >
                    {createOrgMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Organization"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {step === "join" && (
              <div className="space-y-4 text-center">
                <p className="text-muted-foreground">
                  To join an existing organization, you need an invitation from an administrator.
                </p>
                <p className="text-sm text-muted-foreground">
                  Contact your organization administrator to send you an invitation link.
                </p>
                <Button
                  onClick={() => setStep("choose")}
                  variant="outline"
                  className="w-full"
                >
                  Back
                </Button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Need help? Contact support at support@afrigov.com
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
