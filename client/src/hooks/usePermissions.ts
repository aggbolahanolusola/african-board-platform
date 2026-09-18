import { useAuth } from "../_core/hooks/useAuth";
import type { Permission } from "../../../server/permissions";

/**
 * Permission definitions matching the server-side permissions
 */
export type UIPermission = Permission;

/**
 * Hook to check user permissions and conditionally render UI
 * Usage: const { can } = usePermissions(); if (can('create_meeting')) { ... }
 */
export function usePermissions() {
  const { user } = useAuth();

  // Role-based permission matrix (must match server/permissions.ts)
  const rolePermissions: Record<string, UIPermission[]> = {
    administrator: [
      "manage_organization",
      "manage_members",
      "manage_roles",
      "view_members",
      "create_meeting",
      "edit_meeting",
      "delete_meeting",
      "view_meeting",
      "record_meeting",
      "upload_document",
      "edit_document",
      "delete_document",
      "view_document",
      "share_document",
      "manage_compliance",
      "view_compliance",
      "generate_reports",
      "view_reports",
      "manage_voting",
      "vote",
      "view_voting",
      "manage_billing",
      "view_billing",
      "manage_settings",
      "view_settings",
    ],
    secretary: [
      "manage_members",
      "view_members",
      "create_meeting",
      "edit_meeting",
      "delete_meeting",
      "view_meeting",
      "record_meeting",
      "upload_document",
      "edit_document",
      "delete_document",
      "view_document",
      "share_document",
      "vote",
      "view_voting",
      "view_settings",
    ],
    boardMember: [
      "view_meeting",
      "view_document",
      "share_document",
      "vote",
      "view_voting",
      "view_settings",
    ],
    complianceOfficer: [
      "manage_compliance",
      "view_compliance",
      "generate_reports",
      "view_reports",
      "view_document",
      "upload_document",
      "view_meeting",
      "view_settings",
    ],
  };

  /**
   * Check if user has a specific permission
   */
  const can = (permission: UIPermission): boolean => {
    if (!user) return false;

    const userRole = user.userRole || "boardMember";
    const permissions = rolePermissions[userRole] || [];

    return permissions.includes(permission);
  };

  /**
   * Check if user has any of the specified permissions
   */
  const canAny = (permissions: UIPermission[]): boolean => {
    return permissions.some((permission) => can(permission));
  };

  /**
   * Check if user has all of the specified permissions
   */
  const canAll = (permissions: UIPermission[]): boolean => {
    return permissions.every((permission) => can(permission));
  };

  /**
   * Get user's role
   */
  const getUserRole = (): string => {
    return user?.userRole || "boardMember";
  };

  /**
   * Check if user is admin
   */
  const isAdmin = (): boolean => {
    return user?.userRole === "administrator";
  };

  /**
   * Check if user is secretary
   */
  const isSecretary = (): boolean => {
    return user?.userRole === "secretary";
  };

  /**
   * Check if user is board member
   */
  const isBoardMember = (): boolean => {
    return user?.userRole === "boardMember";
  };

  /**
   * Check if user is compliance officer
   */
  const isComplianceOfficer = (): boolean => {
    return user?.userRole === "complianceOfficer";
  };

  return {
    can,
    canAny,
    canAll,
    getUserRole,
    isAdmin,
    isSecretary,
    isBoardMember,
    isComplianceOfficer,
    user,
  };
}
