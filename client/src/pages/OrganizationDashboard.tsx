import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Calendar,
  FileText,
  Settings,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Edit,
  Download,
  LogOut,
  Home,
  Video,
  Shield,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import { TrialBanner } from "@/components/TrialBanner";
import { TeamInviteModal } from "@/components/TeamInviteModal";

// Mock data for charts
const meetingData = [
  { month: "Jan", meetings: 4, users: 8 },
  { month: "Feb", meetings: 6, users: 12 },
  { month: "Mar", meetings: 8, users: 15 },
  { month: "Apr", meetings: 10, users: 18 },
  { month: "May", meetings: 12, users: 22 },
  { month: "Jun", meetings: 14, users: 25 },
];

const storageData = [
  { name: "Documents", value: 45, fill: "#2d8a8a" },
  { name: "Recordings", value: 30, fill: "#c4a000" },
  { name: "Archives", value: 15, fill: "#c67c4e" },
  { name: "Available", value: 10, fill: "#e0e0e0" },
];

const teamMembers = [
  { id: 1, name: "John Okafor", email: "john@example.com", role: "Administrator", status: "Active" },
  { id: 2, name: "Amara Mensah", email: "amara@example.com", role: "Board Member", status: "Active" },
  { id: 3, name: "Kofi Asante", email: "kofi@example.com", role: "Secretary", status: "Pending" },
  { id: 4, name: "Zainab Hassan", email: "zainab@example.com", role: "Compliance Officer", status: "Active" },
];

const billingHistory = [
  { id: 1, date: "2026-01-15", description: "Professional Plan - Monthly", amount: "$149.00", status: "Paid" },
  { id: 2, date: "2025-12-15", description: "Professional Plan - Monthly", amount: "$149.00", status: "Paid" },
  { id: 3, date: "2025-11-15", description: "Professional Plan - Monthly", amount: "$149.00", status: "Paid" },
  { id: 4, date: "2025-10-15", description: "Professional Plan - Monthly", amount: "$149.00", status: "Paid" },
];

export default function OrganizationDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { can, isAdmin } = usePermissions();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [refreshTeamMembers, setRefreshTeamMembers] = useState(0);

  const { logout, loading: authLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Redirect to onboarding if user doesn't have an organization
  if (isAuthenticated && user && !user.organizationId) {
    navigate("/onboarding");
    return null;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">Please sign in to access the dashboard.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/login")} variant="default">
              Sign In
            </Button>
            <Button onClick={() => navigate("/signup")} variant="outline">
              Create Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      {/* Navigation Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AG</span>
              </div>
              <span className="font-semibold text-foreground hidden sm:inline">NurtGov</span>
            </button>

            {/* Navigation Links */}
            <div className="flex items-center gap-1 flex-1 justify-center">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Button>
              {can("view_meeting") && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/meetings")} className="gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Meetings</span>
                </Button>
              )}
              {can("view_meeting") && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/recordings")} className="gap-2">
                  <Video className="w-4 h-4" />
                  <span className="hidden sm:inline">Recordings</span>
                </Button>
              )}
              {can("view_document") && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/documents")} className="gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Documents</span>
                </Button>
              )}
              {can("view_compliance") && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/compliance")} className="gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Compliance</span>
                </Button>
              )}
            </div>

            {/* Right Side Actions */}
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
          <h1 className="text-3xl font-display text-foreground">Organization Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription, team, and usage</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Trial Banner */}
        {user?.organizationId && <TrialBanner organizationId={user.organizationId} />}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Active Users</span>
                <Users className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">22/25</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-green-600" />
                3 available slots
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Meetings This Month</span>
                <Calendar className="w-4 h-4 text-accent" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">14</div>
              <p className="text-xs text-muted-foreground mt-1">Unlimited available</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Storage Used</span>
                <FileText className="w-4 h-4 text-secondary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">90/100 GB</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-orange-600" />
                Upgrade recommended
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Billing Status</span>
                <CreditCard className="w-4 h-4 text-green-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground mt-1">Next billing: Feb 15, 2026</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="team">Team Members</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="plan">Plan & Usage</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Meeting Trends */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Meeting Activity</CardTitle>
                  <CardDescription>Meetings and participants over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={meetingData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="meetings" stroke="var(--primary)" strokeWidth={2} />
                      <Line type="monotone" dataKey="users" stroke="var(--accent)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Storage Breakdown */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Storage Breakdown</CardTitle>
                  <CardDescription>100 GB total capacity</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={storageData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {storageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-border bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {can("create_meeting") && (
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => navigate("/meetings")}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule Meeting
                    </Button>
                  )}
                  {can("manage_members") && (
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => setShowInviteModal(true)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Invite Team Member
                    </Button>
                  )}
                  {can("view_reports") && (
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => navigate("/dashboard?tab=plan")}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View Reports
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Members Tab */}
          {can("view_members") && (
          <TabsContent value="team" className="space-y-6">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage your board members and staff</CardDescription>
                </div>
                {can("manage_members") && (
                <Button
                  size="sm"
                  onClick={() => setShowInviteModal(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-card/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {member.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge
                          variant="outline"
                          className={
                            member.status === "Active"
                              ? "border-green-600/30 bg-green-50 text-green-700"
                              : "border-yellow-600/30 bg-yellow-50 text-yellow-700"
                          }
                        >
                          {member.status}
                        </Badge>
                        <Badge variant="outline">{member.role}</Badge>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => alert(`Edit ${member.name}`)}
                            title="Edit member"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => alert(`Remove ${member.name}`)}
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Billing Tab */}
          {can("view_billing") && (
          <TabsContent value="billing" className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>Your recent invoices and payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billingHistory.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-card/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{invoice.description}</p>
                        <p className="text-sm text-muted-foreground">{invoice.date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge
                          variant="outline"
                          className="border-green-600/30 bg-green-50 text-green-700"
                        >
                          {invoice.status}
                        </Badge>
                        <p className="font-semibold text-foreground w-24 text-right">{invoice.amount}</p>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => alert(`Download invoice ${invoice.id}`)}
                          title="Download invoice"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Manage your billing information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 border border-border rounded-lg bg-card/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Visa ending in 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/2027</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => alert("Update payment method")}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Plan & Usage Tab */}
          {can("view_billing") && (
          <TabsContent value="plan" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Plan */}
              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Professional Plan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-3xl font-bold text-primary">$149</p>
                    <p className="text-sm text-muted-foreground">/month, billed monthly</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm">Up to 25 board members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm">Unlimited meetings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm">100 GB storage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm">Live transcription</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm">Digital signatures</span>
                    </div>
                  </div>
                  <div className="pt-4 space-y-2">
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={() => alert("Manage subscription portal")}
                    >
                      Manage Subscription
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => alert("Upgrade to Enterprise plan")}
                    >
                      Upgrade to Enterprise
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Usage Limits */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Usage Limits</CardTitle>
                  <CardDescription>Your current usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Team Members</p>
                      <p className="text-sm text-muted-foreground">22 / 25</p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: "88%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Storage</p>
                      <p className="text-sm text-muted-foreground">90 / 100 GB</p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: "90%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Meetings (This Month)</p>
                      <p className="text-sm text-muted-foreground">14 / Unlimited</p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: "30%" }}></div>
                    </div>
                  </div>

                  <div className="pt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-900">Storage Nearly Full</p>
                        <p className="text-sm text-orange-800 mt-1">
                          You're using 90% of your storage. Consider upgrading to Enterprise for unlimited storage.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Team Invite Modal */}
      <TeamInviteModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onSuccess={() => setRefreshTeamMembers((prev) => prev + 1)}
      />
    </div>
  );
}
