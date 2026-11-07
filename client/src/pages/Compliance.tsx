import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { TrialBanner } from "@/components/TrialBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Clock, Home, Calendar, Video, FileText, Shield, Settings, LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Compliance() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [organizationId, setOrganizationId] = useState<number | null>(null);

  const { data: complianceLogs, isLoading } = trpc.compliance.getLogs.useQuery();

  const { logout, loading: authLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const frameworks = [
    { id: "kingIV", name: "King IV Code", region: "South Africa", description: "Ethical leadership and sustainable development" },
    { id: "ohada", name: "OHADA", region: "West & Central Africa", description: "Harmonized business laws" },
    { id: "popia", name: "POPIA", region: "South Africa", description: "Personal information protection" },
    { id: "ndpr", name: "NDPR", region: "Nigeria", description: "Data protection regulation" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "nonCompliant":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-100 text-green-800";
      case "nonCompliant":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateComplianceScore = () => {
    if (!complianceLogs || complianceLogs.length === 0) return 0;
    const compliant = complianceLogs.filter((log: any) => log.status === "compliant").length;
    return Math.round((compliant / complianceLogs.length) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      {/* Navigation Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AG</span>
              </div>
              <span className="font-semibold text-foreground hidden sm:inline">NurtGov</span>
            </button>

            <div className="flex items-center gap-1 flex-1 justify-center">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/meetings")} className="gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Meetings</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/recordings")} className="gap-2">
                <Video className="w-4 h-4" />
                <span className="hidden sm:inline">Recordings</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/documents")} className="gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Documents</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/compliance")} className="gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Compliance</span>
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className="bg-primary/10 text-primary border-primary/20 hidden sm:inline-flex">Professional Plan</Badge>
              <Button variant="outline" size="sm" onClick={() => navigate("/profile")} className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} disabled={authLoading} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Page Title */}
      <div className="border-b border-border bg-card/50 py-6">
        <div className="container max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-display text-foreground">Compliance Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track governance compliance across African frameworks</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Trial Banner */}
          {user?.organizationId && <TrialBanner organizationId={user.organizationId} />}

          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Compliance Score</CardTitle>
              <CardDescription>Aggregate compliance status across all frameworks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-bold text-primary">{calculateComplianceScore()}%</span>
                  <span className="text-sm text-muted-foreground">
                    {complianceLogs?.length || 0} items tracked
                  </span>
                </div>
                <Progress value={calculateComplianceScore()} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Compliance Frameworks */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Compliance Frameworks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {frameworks.map((framework) => (
                <Card key={framework.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{framework.name}</CardTitle>
                        <CardDescription>{framework.region}</CardDescription>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{framework.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Compliance Logs */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Recent Compliance Logs</h2>
            <div className="grid gap-4">
              {isLoading ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">Loading compliance logs...</p>
                  </CardContent>
                </Card>
              ) : complianceLogs && complianceLogs.length > 0 ? (
                complianceLogs.map((log: any) => (
                  <Card key={log.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(log.status)}
                          <div>
                            <p className="font-medium">{log.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">No compliance logs yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
