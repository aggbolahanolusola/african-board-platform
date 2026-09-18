import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, HardDrive, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface StorageDashboardProps {
  organizationId: number;
}

export function StorageDashboard({ organizationId }: StorageDashboardProps) {
  const storageQuery = trpc.documents.getStorageInfo.useQuery({ organizationId });
  const deleteMutation = trpc.documents.delete.useMutation();
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  const data = storageQuery.data?.data;
  const storagePercentage = data ? (data.used / data.limit) * 100 : 0;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getStorageStatus = (percentage: number): "ok" | "warning" | "critical" => {
    if (percentage >= 100) return "critical";
    if (percentage >= 90) return "warning";
    return "ok";
  };

  const getStatusColor = (status: "ok" | "warning" | "critical") => {
    switch (status) {
      case "critical":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      default:
        return "text-green-600";
    }
  };

  const status = getStorageStatus(storagePercentage);

  if (storageQuery.isLoading) {
    return <div className="text-center py-8">Loading storage information...</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-red-600">Failed to load storage information</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Storage Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              <div>
                <CardTitle>Storage Usage</CardTitle>
                <CardDescription>Organization storage quota</CardDescription>
              </div>
            </div>
            <div className={`text-2xl font-bold ${getStatusColor(status)}`}>
              {Math.round(storagePercentage)}%
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div>
            <Progress value={Math.min(storagePercentage, 100)} className="h-3" />
          </div>

          {/* Storage Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Used</p>
              <p className="text-lg font-semibold">{formatBytes(data.used)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Limit</p>
              <p className="text-lg font-semibold">{formatBytes(data.limit)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Remaining</p>
              <p className="text-lg font-semibold">{formatBytes(data.remaining)}</p>
            </div>
          </div>

          {/* Document Count */}
          <div className="pt-2 border-t">
            <p className="text-sm text-gray-600">Documents: <span className="font-semibold">{data.documentCount}</span></p>
          </div>

          {/* Alerts */}
          {status === "critical" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Storage quota exceeded! Delete documents to free up space or upgrade your plan.
              </AlertDescription>
            </Alert>
          )}

          {status === "warning" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Storage quota is nearly full ({Math.round(storagePercentage)}% used). Consider upgrading your plan.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Storage Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Storage Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Compress large PDFs before uploading</li>
            <li>Delete old or duplicate documents regularly</li>
            <li>Archive completed board meetings</li>
            <li>Upgrade your plan for more storage</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
