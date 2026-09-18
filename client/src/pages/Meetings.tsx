import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import { TrialBanner } from "@/components/TrialBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Plus, Users, AlertCircle, Home, Video, FileText, Shield, Settings, LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { LimitWarning } from "@/components/FeatureGateBlock";

export default function Meetings() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [, navigate] = useLocation();
  const { canCreateMeeting, getMeetingsRemaining, limits } = useFeatureGate();
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    timezone: "UTC",
    meetingType: "board",
  });

  const { data: meetings, isLoading } = trpc.meeting.list.useQuery();

  const createMeetingMutation = trpc.meeting.create.useMutation();

  const { logout, loading: authLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleCreateMeeting = async () => {
    if (!canCreateMeeting()) return;

    try {
      await createMeetingMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        scheduledAt: new Date(formData.scheduledAt),
        timezone: formData.timezone,
        meetingType: formData.meetingType as "board" | "committee" | "annual" | "special",
      });

      setFormData({
        title: "",
        description: "",
        scheduledAt: "",
        timezone: "UTC",
        meetingType: "board",
      });
      setIsCreateOpen(false);
    } catch (error) {
      console.error("Failed to create meeting:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!user?.organizationId) {
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
                <span className="font-semibold text-foreground hidden sm:inline">AfriGov</span>
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

        <div className="container max-w-7xl mx-auto px-4 py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Meetings</h1>
            <p className="text-muted-foreground">Manage and schedule board meetings</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Please select an organization to view meetings.</p>
            </CardContent>
          </Card>
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
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AG</span>
              </div>
              <span className="font-semibold text-foreground hidden sm:inline">AfriGov</span>
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
          <h1 className="text-3xl font-display text-foreground">Meetings</h1>
          <p className="text-muted-foreground mt-1">Manage and schedule board meetings</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Trial Banner */}
          {user?.organizationId && <TrialBanner organizationId={user.organizationId} />}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div></div>
            {can("create_meeting") && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canCreateMeeting()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule New Meeting</DialogTitle>
                  <DialogDescription>
                    Create a new board meeting and set the agenda
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Meeting Title</Label>
                    <Input
                      id="title"
                      placeholder="Board Meeting - Q1 2026"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Meeting description and objectives"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="scheduledAt">Date & Time</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={formData.timezone} onValueChange={(value) => setFormData({ ...formData, timezone: value })}>
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="CAT">CAT (Central Africa)</SelectItem>
                        <SelectItem value="EAT">EAT (East Africa)</SelectItem>
                        <SelectItem value="WAT">WAT (West Africa)</SelectItem>
                        <SelectItem value="SAST">SAST (South Africa)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="meetingType">Meeting Type</Label>
                    <Select value={formData.meetingType} onValueChange={(value) => setFormData({ ...formData, meetingType: value })}>
                      <SelectTrigger id="meetingType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="board">Board Meeting</SelectItem>
                        <SelectItem value="committee">Committee Meeting</SelectItem>
                        <SelectItem value="annual">Annual General Meeting</SelectItem>
                        <SelectItem value="special">Special Meeting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleCreateMeeting}
                    disabled={createMeetingMutation.isPending || !canCreateMeeting()}
                  >
                    {createMeetingMutation.isPending ? "Creating..." : "Create Meeting"}
                  </Button>
                  {!canCreateMeeting() && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800">
                        You have reached your monthly meeting limit. Please upgrade your plan to create more meetings.
                      </p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>

          {/* Limit Warning */}
          {limits && (
            <LimitWarning
              title="Monthly meetings"
              current={limits.currentMeetings}
              limit={limits.meetingLimit}
              unit="meetings"
            />
          )}

          {/* Meetings List */}
          <div className="grid gap-4">
            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">Loading meetings...</p>
                </CardContent>
              </Card>
            ) : meetings && meetings.length > 0 ? (
              meetings.map((meeting) => (
                <Card key={meeting.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{meeting.title}</CardTitle>
                        <CardDescription>{meeting.description}</CardDescription>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status || 'scheduled')}`}>
                        {meeting.status ? meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1) : 'Scheduled'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(meeting.scheduledAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(meeting.scheduledAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{meeting.timezone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {meeting.meetingType ? meeting.meetingType.charAt(0).toUpperCase() + meeting.meetingType.slice(1) : 'Meeting'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">No meetings scheduled yet. Create one to get started.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
