import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Mail, Lock, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Login() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Handle authentication redirects in useEffect, not in render phase
  useEffect(() => {
    if (isAuthenticated && user?.organizationId) {
      navigate("/dashboard");
    } else if (isAuthenticated && !user?.organizationId) {
      navigate("/onboarding");
    }
  }, [isAuthenticated, user?.organizationId, navigate]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data: any) => {
      setSuccessMessage("Login successful! Redirecting...");
      // Invalidate auth query to refresh user state
      utils.auth.me.invalidate();
      setTimeout(() => {
        // If user has organization, go to dashboard; otherwise go to onboarding
        if (data?.user?.organizationId) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      }, 500);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Login failed. Please check your credentials.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter both email and password");
      return;
    }

    if (!email.includes("@")) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    loginMutation.mutate({ email, password, rememberMe });
  };

  // Show loading state while redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your NurtGov account</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage && (
              <Alert className="mb-6 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            )}

            {errorMessage && (
              <Alert className="mb-6 bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="bg-background"
                />
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={loginMutation.isPending}
                />
                <label
                  htmlFor="rememberMe"
                  className="text-sm font-medium cursor-pointer hover:text-foreground/80 transition-colors"
                >
                  Remember me for 30 days
                </label>
              </div>

              <Button
                type="submit"
                className="w-full mt-6"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">or</span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-primary hover:underline font-medium"
              >
                Sign up here
              </button>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
