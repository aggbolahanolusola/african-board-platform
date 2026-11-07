import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { TrialBanner } from "@/components/TrialBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Lock, Download, Share2, Plus, Eye, Home, Calendar, Video, Shield, Settings, LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Documents() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    documentType: "other",
    isConfidential: false,
  });

  const { data: documents, isLoading } = trpc.document.list.useQuery();

  const { logout, loading: authLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "boardPack":
        return "Board Pack";
      case "resolution":
        return "Resolution";
      case "minutes":
        return "Meeting Minutes";
      case "policy":
        return "Policy";
      case "other":
        return "Other";
      default:
        return type;
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case "boardPack":
      case "minutes":
      case "policy":
        return "📄";
      case "resolution":
        return "✓";
      default:
        return "📎";
    }
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
          <h1 className="text-3xl font-display text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1">Manage board packs, resolutions, and governance documents</p>
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
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>
                    Upload a document to share with board members
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="doc-title">Document Title</Label>
                    <Input
                      id="doc-title"
                      placeholder="Board Pack - Q1 2026"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="doc-description">Description</Label>
                    <Input
                      id="doc-description"
                      placeholder="Document description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="doc-type">Document Type</Label>
                    <Select value={formData.documentType} onValueChange={(value) => setFormData({ ...formData, documentType: value })}>
                      <SelectTrigger id="doc-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="boardPack">Board Pack</SelectItem>
                        <SelectItem value="resolution">Resolution</SelectItem>
                        <SelectItem value="minutes">Meeting Minutes</SelectItem>
                        <SelectItem value="policy">Policy</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="confidential"
                      checked={formData.isConfidential}
                      onChange={(e) => setFormData({ ...formData, isConfidential: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="confidential" className="mb-0">Mark as confidential</Label>
                  </div>
                  <Button>Upload</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Documents List */}
          <div className="grid gap-4">
            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">Loading documents...</p>
                </CardContent>
              </Card>
            ) : documents && documents.length > 0 ? (
              documents.map((doc: any) => (
                <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-2xl">{getDocumentTypeIcon(doc.documentType)}</span>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{doc.title}</CardTitle>
                          <CardDescription>{doc.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.isConfidential && (
                          <Badge variant="outline" className="gap-1">
                            <Lock className="w-3 h-3" />
                            Confidential
                          </Badge>
                        )}
                        <Badge variant="secondary">{getDocumentTypeLabel(doc.documentType)}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">No documents uploaded yet. Upload one to get started.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
