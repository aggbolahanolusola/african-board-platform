import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";

/**
 * Permission types for the system
 */
export type Permission =
  | "manage_organization"
  | "manage_members"
  | "manage_roles"
  | "view_members"
  | "create_meeting"
  | "edit_meeting"
  | "delete_meeting"
  | "view_meeting"
  | "record_meeting"
  | "upload_document"
  | "edit_document"
  | "delete_document"
  | "view_document"
  | "share_document"
  | "manage_compliance"
  | "view_compliance"
  | "generate_reports"
  | "view_reports"
  | "manage_voting"
  | "vote"
  | "view_voting"
  | "manage_billing"
  | "view_billing"
  | "manage_settings"
  | "view_settings";

/**
 * Role-based permission matrix
 * Defines which permissions each role has
 */
export const rolePermissions: Record<string, Permission[]> = {
  administrator: [
    // Organization management
    "manage_organization",
    "manage_members",
    "manage_roles",
    "view_members",
    // Meeting management
    "create_meeting",
    "edit_meeting",
    "delete_meeting",
    "view_meeting",
    "record_meeting",
    // Document management
    "upload_document",
    "edit_document",
    "delete_document",
    "view_document",
    "share_document",
    // Compliance
    "manage_compliance",
    "view_compliance",
    "generate_reports",
    "view_reports",
    // Voting
    "manage_voting",
    "vote",
    "view_voting",
    // Billing & Settings
    "manage_billing",
    "view_billing",
    "manage_settings",
    "view_settings",
  ],

  secretary: [
    // Meeting management
    "create_meeting",
    "edit_meeting",
    "delete_meeting",
    "view_meeting",
    "record_meeting",
    // Document management
    "upload_document",
    "edit_document",
    "delete_document",
    "view_document",
    "share_document",
    // Compliance
    "view_compliance",
    "generate_reports",
    "view_reports",
    // Voting
    "vote",
    "view_voting",
    // Settings
    "view_settings",
    // View members
    "view_members",
  ],

  boardMember: [
    // Meeting access
    "view_meeting",
    // Document access
    "view_document",
    "share_document",
    // Voting
    "vote",
    "view_voting",
    // Settings
    "view_settings",
  ],

  complianceOfficer: [
    // Compliance management
    "manage_compliance",
    "view_compliance",
    "generate_reports",
    "view_reports",
    // Document access
    "view_document",
    "upload_document",
    // Meeting access
    "view_meeting",
    // Settings
    "view_settings",
    // View members
    "view_members",
  ],
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;

  const userRole = user.userRole || "boardMember";
  const permissions = rolePermissions[userRole] || [];

  return permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

/**
 * Get all permissions for a user's role
 */
export function getUserPermissions(user: User | null): Permission[] {
  if (!user) return [];

  const userRole = user.userRole || "boardMember";
  return rolePermissions[userRole] || [];
}

/**
 * Check if a user can perform an action, throw error if not
 */
export function requirePermission(user: User | null, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You do not have permission to ${permission}`,
    });
  }
}

/**
 * Check if a user has any permission, throw error if not
 */
export function requireAnyPermission(user: User | null, permissions: Permission[]): void {
  if (!hasAnyPermission(user, permissions)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You do not have any of the required permissions`,
    });
  }
}

/**
 * Check if a user has all permissions, throw error if not
 */
export function requireAllPermissions(user: User | null, permissions: Permission[]): void {
  if (!hasAllPermissions(user, permissions)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You do not have all required permissions`,
    });
  }
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: string): string {
  const displayNames: Record<string, string> = {
    administrator: "Administrator",
    secretary: "Secretary",
    boardMember: "Board Member",
    complianceOfficer: "Compliance Officer",
  };

  return displayNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    administrator: "Full access to all organization features and settings",
    secretary: "Can manage meetings, documents, and generate reports",
    boardMember: "Can view meetings, documents, and participate in voting",
    complianceOfficer: "Can manage compliance tracking and generate compliance reports",
  };

  return descriptions[role] || "User role";
}

/**
 * Get all available roles
 */
export function getAvailableRoles(): Array<{ id: string; name: string; description: string }> {
  return [
    {
      id: "administrator",
      name: getRoleDisplayName("administrator"),
      description: getRoleDescription("administrator"),
    },
    {
      id: "secretary",
      name: getRoleDisplayName("secretary"),
      description: getRoleDescription("secretary"),
    },
    {
      id: "boardMember",
      name: getRoleDisplayName("boardMember"),
      description: getRoleDescription("boardMember"),
    },
    {
      id: "complianceOfficer",
      name: getRoleDisplayName("complianceOfficer"),
      description: getRoleDescription("complianceOfficer"),
    },
  ];
}

/**
 * Check if a user can manage another user's role
 * Only administrators can manage roles
 */
export function canManageUserRole(user: User | null): boolean {
  return hasPermission(user, "manage_roles");
}

/**
 * Check if a user can view organization members
 */
export function canViewMembers(user: User | null): boolean {
  return hasPermission(user, "view_members");
}

/**
 * Check if a user can create meetings
 */
export function canCreateMeeting(user: User | null): boolean {
  return hasPermission(user, "create_meeting");
}

/**
 * Check if a user can edit meetings
 */
export function canEditMeeting(user: User | null): boolean {
  return hasPermission(user, "edit_meeting");
}

/**
 * Check if a user can delete meetings
 */
export function canDeleteMeeting(user: User | null): boolean {
  return hasPermission(user, "delete_meeting");
}

/**
 * Check if a user can view meetings
 */
export function canViewMeeting(user: User | null): boolean {
  return hasPermission(user, "view_meeting");
}

/**
 * Check if a user can upload documents
 */
export function canUploadDocument(user: User | null): boolean {
  return hasPermission(user, "upload_document");
}

/**
 * Check if a user can edit documents
 */
export function canEditDocument(user: User | null): boolean {
  return hasPermission(user, "edit_document");
}

/**
 * Check if a user can delete documents
 */
export function canDeleteDocument(user: User | null): boolean {
  return hasPermission(user, "delete_document");
}

/**
 * Check if a user can view documents
 */
export function canViewDocument(user: User | null): boolean {
  return hasPermission(user, "view_document");
}

/**
 * Check if a user can vote
 */
export function canVote(user: User | null): boolean {
  return hasPermission(user, "vote");
}

/**
 * Check if a user can manage compliance
 */
export function canManageCompliance(user: User | null): boolean {
  return hasPermission(user, "manage_compliance");
}

/**
 * Check if a user can view compliance
 */
export function canViewCompliance(user: User | null): boolean {
  return hasPermission(user, "view_compliance");
}

/**
 * Check if a user can generate reports
 */
export function canGenerateReports(user: User | null): boolean {
  return hasPermission(user, "generate_reports");
}

/**
 * Check if a user can manage billing
 */
export function canManageBilling(user: User | null): boolean {
  return hasPermission(user, "manage_billing");
}

/**
 * Check if a user can view billing
 */
export function canViewBilling(user: User | null): boolean {
  return hasPermission(user, "view_billing");
}
