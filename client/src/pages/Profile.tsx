import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Lock, 
  Bell, 
  Shield,
  CheckCircle,
  AlertCircle,
  LogOut,
  MailCheck,
  MailX
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Profile() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    location: "",
    bio: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notificationPreferences, setNotificationPreferences] = useState({
    emailNotifications: true,
    meetingReminders: true,
    weeklyDigest: true,
    complianceAlerts: true,
  });

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  if (!isAuthenticated || !user) {
    navigate("/login");
    return null;
  }

  const { logout, loading: authLoading } = useAuth();

  const handleLogoutClick = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      setErrorMessage("Failed to logout");
    }
  };

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      setSuccessMessage("Profile updated successfully!");
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Failed to update profile");
    },
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setSuccessMessage("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Failed to change password");
    },
  });

  const resendVerificationMutation = trpc.auth.resendVerificationEmailFromSettings.useMutation({
    onSuccess: () => {
      setResendMessage("Verification email sent! Please check your inbox.");
      setResendLoading(false);
      setTimeout(() => setResendMessage(""), 5000);
    },
    onError: (error: any) => {
      setResendMessage(error.message || "Failed to send verification email");
      setResendLoading(false);
    },
  });

  const handleResendVerification = () => {
    setResendLoading(true);
    setResendMessage("");
    const baseUrl = window.location.origin;
    resendVerificationMutation.mutate({ baseUrl });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (key: string) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const handleSaveProfile = () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.name || !formData.email) {
      setErrorMessage("Name and email are required");
      return;
    }

    updateProfileMutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      bio: formData.bio,
    });
  };

  const handleChangePassword = () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setErrorMessage("All password fields are required");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters");
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
      confirmPassword: passwordData.confirmPassword,
    });
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display text-foreground">Account Settings</h1>
              <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
            </div>
            <Button variant="outline" onClick={handleLogoutClick} disabled={authLoading} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-8">
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

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-4">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Member since {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="profile" className="gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Notifications</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your personal details</CardDescription>
                      </div>
                      <Button
                        variant={isEditing ? "outline" : "default"}
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        {isEditing ? "Cancel" : "Edit Profile"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Full Name
                        </label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleFormChange}
                          disabled={!isEditing}
                          placeholder="Your full name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Email Address
                        </label>
                        <Input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleFormChange}
                          disabled={!isEditing}
                          placeholder="your@email.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Phone Number
                        </label>
                        <Input
                          name="phone"
                          value={formData.phone}
                          onChange={handleFormChange}
                          disabled={!isEditing}
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Location
                        </label>
                        <Input
                          name="location"
                          value={formData.location}
                          onChange={handleFormChange}
                          disabled={!isEditing}
                          placeholder="City, Country"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bio</label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleFormChange}
                        disabled={!isEditing}
                        placeholder="Tell us about yourself"
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground disabled:opacity-50"
                        rows={4}
                      />
                    </div>

                    {isEditing && (
                      <Button onClick={handleSaveProfile} className="w-full" disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Change Password
                    </CardTitle>
                    <CardDescription>Update your password to keep your account secure</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Current Password</label>
                      <Input
                        name="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter your current password"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">New Password</label>
                      <Input
                        name="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter your new password"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be at least 8 characters long
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Confirm New Password</label>
                      <Input
                        name="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirm your new password"
                      />
                    </div>

                    <Button onClick={handleChangePassword} className="w-full" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MailCheck className="w-5 h-5" />
                      Email Verification
                    </CardTitle>
                    <CardDescription>Verify your email address to unlock all features</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <MailX className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Email Not Verified</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Verify your email to ensure account security and receive important notifications
                          </p>
                        </div>
                      </div>
                    </div>
                    {resendMessage && (
                      <Alert className={resendMessage.includes("sent") ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                        <CheckCircle className={resendMessage.includes("sent") ? "h-4 w-4 text-green-600" : "h-4 w-4 text-red-600"} />
                        <AlertDescription className={resendMessage.includes("sent") ? "text-green-800" : "text-red-800"}>
                          {resendMessage}
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button 
                      onClick={handleResendVerification} 
                      disabled={resendLoading || resendVerificationMutation.isPending}
                      className="w-full"
                    >
                      {resendLoading || resendVerificationMutation.isPending ? "Sending..." : "Resend Verification Email"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Activity</CardTitle>
                    <CardDescription>Your recent account activity</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Account Created</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Last Sign In</p>
                          <p className="text-xs text-muted-foreground">
                            {user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString() : "Never"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>Manage how you receive notifications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        key: "emailNotifications",
                        label: "Email Notifications",
                        description: "Receive important updates via email",
                      },
                      {
                        key: "meetingReminders",
                        label: "Meeting Reminders",
                        description: "Get reminded about upcoming board meetings",
                      },
                      {
                        key: "weeklyDigest",
                        label: "Weekly Digest",
                        description: "Receive a weekly summary of board activities",
                      },
                      {
                        key: "complianceAlerts",
                        label: "Compliance Alerts",
                        description: "Be notified about compliance requirements",
                      },
                    ].map((pref) => (
                      <div
                        key={pref.key}
                        className="flex items-center justify-between py-3 border-b border-border last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">{pref.label}</p>
                          <p className="text-xs text-muted-foreground">{pref.description}</p>
                        </div>
                        <button
                          onClick={() => handleNotificationChange(pref.key)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notificationPreferences[pref.key as keyof typeof notificationPreferences]
                              ? "bg-primary"
                              : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationPreferences[pref.key as keyof typeof notificationPreferences]
                                ? "translate-x-5"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    ))}

                    <Button onClick={() => setSuccessMessage("Preferences saved!")} className="w-full mt-4">
                      Save Preferences
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
