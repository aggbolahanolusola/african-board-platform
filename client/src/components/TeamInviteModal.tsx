import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, X, Check, Search } from "lucide-react";

interface TeamInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface SelectedUser {
  id: string | number;
  email: string;
  name?: string;
  role: "admin" | "board_member" | "secretary" | "compliance_officer" | "observer";
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrator" },
  { value: "board_member", label: "Board Member" },
  { value: "secretary", label: "Secretary" },
  { value: "compliance_officer", label: "Compliance Officer" },
  { value: "observer", label: "Observer" },
];

function mapRoleToBackend(
  role: "admin" | "board_member" | "secretary" | "compliance_officer" | "observer"
): "administrator" | "boardMember" | "secretary" | "complianceOfficer" {
  const roleMap: Record<string, any> = {
    admin: "administrator",
    board_member: "boardMember",
    secretary: "secretary",
    compliance_officer: "complianceOfficer",
    observer: "boardMember", // Map observer to board member
  };
  return roleMap[role];
}

export function TeamInviteModal({
  open,
  onOpenChange,
  onSuccess,
}: TeamInviteModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [defaultRole, setDefaultRole] = useState<SelectedUser["role"]>("board_member");
  const [isInviting, setIsInviting] = useState(false);

  // Search for users with debouncing
  const { data: searchResults, isLoading: isSearching } =
    trpc.organization.searchUsersToInvite.useQuery(
      { query: searchQuery },
      {
        enabled: searchQuery.length > 0,
        staleTime: 5000,
      }
    );

  // Bulk invite mutation
  const { mutate: bulkInvite } = trpc.organization.bulkInviteUsers.useMutation({
    onSuccess: (result) => {
      const successful = result.filter((r) => r.success).length;
      const failed = result.filter((r) => !r.success).length;
      if (failed > 0) {
        toast.error(`Successfully invited ${successful} user(s), but ${failed} failed.`);
      } else {
        toast.success(`Successfully invited ${successful} user(s)`);
      }
      setSelectedUsers([]);
      setSearchQuery("");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invitations");
    },
  });

  const handleAddUser = useCallback(
    (user: { id: string | number; email: string; name?: string }) => {
      // Check if user is already selected
      if (selectedUsers.some((u) => u.id === user.id)) {
        toast.error(`${user.email} is already in the invite list`);
        return;
      }

      setSelectedUsers((prev) => [
        ...prev,
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: defaultRole,
        },
      ]);
    },
    [selectedUsers, defaultRole, toast]
  );

  const handleRemoveUser = useCallback((userId: string | number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const handleUpdateUserRole = useCallback(
    (userId: string | number, newRole: SelectedUser["role"]) => {
      setSelectedUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    },
    []
  );

  const handleSendInvitations = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user to invite");
      return;
    }

    setIsInviting(true);
    try {
      // Group users by role for bulk invite
      const roleMap: Record<string, string[]> = {};
      selectedUsers.forEach((u) => {
        const role = mapRoleToBackend(u.role);
        if (!roleMap[role]) roleMap[role] = [];
        roleMap[role].push(u.email);
      });

      // Send invitations for each role
      for (const [role, emails] of Object.entries(roleMap)) {
        bulkInvite({
          emails,
          role: role as "administrator" | "boardMember" | "secretary" | "complianceOfficer",
        });
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleClose = () => {
    if (!isInviting) {
      setSelectedUsers([]);
      setSearchQuery("");
      onOpenChange(false);
    }
  };

  // Filter out already selected users from search results
  const availableUsers = useMemo(() => {
    if (!searchResults) return [];
    const selectedIds = new Set(selectedUsers.map((u) => String(u.id)));
    return searchResults.filter((user) => !selectedIds.has(String(user.id)));
  }, [searchResults, selectedUsers]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
          <DialogDescription>
            Search for users and invite them to join your organization with specific roles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Search Users</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            {searchQuery.length > 0 && (
              <ScrollArea className="border border-border rounded-lg h-64">
                <div className="p-4 space-y-2">
                  {isSearching ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : availableUsers.length > 0 ? (
                    availableUsers.map((user) => (
                      <div
                        key={String(user.id)}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{user.name || user.email}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddUser({ id: user.id, email: user.email || "", name: user.name || undefined })}
                        >
                          Add
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      <p className="text-sm">No users found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Default Role Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Role for New Users</label>
            <Select value={defaultRole} onValueChange={(value: any) => setDefaultRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Users */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Selected Users ({selectedUsers.length})
              </label>
              {selectedUsers.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedUsers([])}
                  className="text-xs"
                >
                  Clear All
                </Button>
              )}
            </div>

            {selectedUsers.length > 0 ? (
              <ScrollArea className="border border-border rounded-lg h-64">
                <div className="p-4 space-y-3">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.name || user.email}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={user.role}
                          onValueChange={(value: any) =>
                            handleUpdateUserRole(user.id, value)
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveUser(user.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-32 border border-dashed border-border rounded-lg text-muted-foreground">
                <p className="text-sm">No users selected. Search and add users above.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isInviting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendInvitations}
            disabled={selectedUsers.length === 0 || isInviting}
            className="bg-primary hover:bg-primary/90"
          >
            {isInviting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Send Invitations ({selectedUsers.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
