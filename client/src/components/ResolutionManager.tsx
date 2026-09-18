import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, CheckCircle, Clock, XCircle } from "lucide-react";

interface ResolutionManagerProps {
  organizationId: number;
  meetingId?: number;
}

export function ResolutionManager({ organizationId, meetingId }: ResolutionManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requiresSignature: true,
  });

  // Get resolutions
  const { data: resolutionsData, isLoading: isLoadingResolutions, refetch } = trpc.voting.getResolutions.useQuery(
    {
      organizationId,
      meetingId,
    },
    { enabled: !!organizationId }
  );

  // Create resolution mutation
  const createResolutionMutation = trpc.voting.createResolution.useMutation({
    onSuccess: () => {
      console.log("Resolution created successfully");
      setFormData({ title: "", description: "", requiresSignature: true });
      setShowForm(false);
      refetch();
    },
    onError: (error) => {
      console.error("Failed to create resolution:", error);
    },
  });

  const handleCreateResolution = () => {
    if (!formData.title.trim()) {
      console.error("Please enter a resolution title");
      return;
    }

    createResolutionMutation.mutate({
      organizationId,
      meetingId,
      title: formData.title,
      description: formData.description,
      requiresSignature: formData.requiresSignature,
    });
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "draft":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "executed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Resolutions</h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Resolution
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Create New Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <Input
                placeholder="Enter resolution title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                placeholder="Enter resolution description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.requiresSignature}
                onChange={(e) => setFormData({ ...formData, requiresSignature: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm">Requires Signature</span>
            </label>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateResolution}
                disabled={createResolutionMutation.isPending}
                className="flex-1"
              >
                {createResolutionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Resolution"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolutions List */}
      {isLoadingResolutions ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : resolutionsData?.resolutions && resolutionsData.resolutions.length > 0 ? (
        <div className="space-y-3">
          {resolutionsData.resolutions.map((resolution) => (
            <Card key={resolution.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(resolution.status)}
                      <h4 className="font-semibold">{resolution.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeColor(resolution.status)}`}>
                        {resolution.status}
                      </span>
                    </div>
                    {resolution.description && (
                      <p className="text-sm text-gray-600 mb-2">{resolution.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {resolution.requiresSignature && (
                        <span>✓ Requires Signature</span>
                      )}
                      <span>Created: {new Date(resolution.createdAt || new Date()).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            No resolutions yet. Create one to get started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
