import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Upload, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DocumentUploadProps {
  organizationId: number;
  meetingId?: number;
  onUploadSuccess?: () => void;
}

export function DocumentUpload({ organizationId, meetingId, onUploadSuccess }: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState<"boardPack" | "resolution" | "minutes" | "policy" | "other">("other");
  const [isConfidential, setIsConfidential] = useState(false);

  const uploadMutation = trpc.documents.upload.useMutation();
  const storageQuery = trpc.documents.getStorageInfo.useQuery({ organizationId });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setTitle(file.name.replace(/\.[^/.]+$/, "")); // Remove extension from filename
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a document title");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 50)); // First 50% for reading
        }
      };

      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          setProgress(50);

          const result = await uploadMutation.mutateAsync({
            fileName: selectedFile.name,
            mimeType: selectedFile.type,
            fileSize: selectedFile.size,
            base64Data,
            organizationId,
            meetingId,
            title: title.trim(),
            description: description.trim(),
            documentType,
            isConfidential,
          });

          setProgress(100);
          toast.success("Document uploaded successfully!");
          
          // Reset form
          setSelectedFile(null);
          setTitle("");
          setDescription("");
          setDocumentType("other");
          setIsConfidential(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }

          // Refresh storage info
          storageQuery.refetch();
          onUploadSuccess?.();
        } catch (error: any) {
          toast.error(error.message || "Failed to upload document");
        } finally {
          setUploading(false);
          setProgress(0);
        }
      };

      reader.readAsDataURL(selectedFile);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload document");
      setUploading(false);
      setProgress(0);
    }
  };

  const storageData = storageQuery.data?.data;
  const storagePercentage = storageData ? (storageData.used / storageData.limit) * 100 : 0;
  const storageWarning = storagePercentage >= 90;
  const storageCritical = storagePercentage >= 100;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Storage Info */}
      {storageData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Storage Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{formatBytes(storageData.used)} of {formatBytes(storageData.limit)}</span>
              <span className={storagePercentage >= 90 ? "text-red-600 font-semibold" : "text-gray-600"}>
                {Math.round(storagePercentage)}%
              </span>
            </div>
            <Progress value={Math.min(storagePercentage, 100)} className="h-2" />
            {storageWarning && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {storageCritical
                    ? "Storage quota exceeded. Delete documents to free up space."
                    : "Storage quota is nearly full. Consider upgrading your plan."}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>Upload board documents, resolutions, minutes, and more</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select File</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                disabled={uploading || storageCritical}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || storageCritical}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              {selectedFile && (
                <div className="flex items-center gap-2 flex-1 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>{selectedFile.name}</span>
                  <span className="text-gray-500">({formatBytes(selectedFile.size)})</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Document Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              placeholder="Enter document title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              placeholder="Optional description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <label htmlFor="docType" className="text-sm font-medium">
              Document Type
            </label>
            <select
              id="docType"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as any)}
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="other">Other</option>
              <option value="boardPack">Board Pack</option>
              <option value="resolution">Resolution</option>
              <option value="minutes">Meeting Minutes</option>
              <option value="policy">Policy</option>
            </select>
          </div>

          {/* Confidential Checkbox */}
          <div className="flex items-center gap-2">
            <input
              id="confidential"
              type="checkbox"
              checked={isConfidential}
              onChange={(e) => setIsConfidential(e.target.checked)}
              disabled={uploading}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="confidential" className="text-sm font-medium cursor-pointer">
              Mark as Confidential
            </label>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !title.trim() || uploading || storageCritical}
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
