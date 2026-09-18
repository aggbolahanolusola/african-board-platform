import { int, bigint, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json, longtext, index, foreignKey } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: text("passwordHash"),
  isEmailVerified: boolean("isEmailVerified").default(false).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  organizationId: int("organizationId"),
  userRole: mysqlEnum("userRole", ["boardMember", "secretary", "administrator", "complianceOfficer"]).default("boardMember"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Organizations table
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  country: varchar("country", { length: 100 }),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  complianceFrameworks: json("complianceFrameworks").$type<string[]>(),
  dataResidency: varchar("dataResidency", { length: 100 }).default("regional"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// Meetings table
export const meetings = mysqlTable("meetings", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduledAt").notNull(),
  endTime: timestamp("endTime"),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  location: varchar("location", { length: 255 }),
  meetingType: mysqlEnum("meetingType", ["board", "committee", "annual", "special"]).default("board"),
  status: mysqlEnum("status", ["scheduled", "inProgress", "completed", "cancelled"]).default("scheduled"),
  recordingUrl: varchar("recordingUrl", { length: 500 }),
  transcriptionUrl: varchar("transcriptionUrl", { length: 500 }),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_org_meeting").on(table.organizationId),
  index("idx_meeting_status").on(table.status),
]));

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = typeof meetings.$inferInsert;

// Meeting Participants
export const meetingParticipants = mysqlTable("meetingParticipants", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["invited", "accepted", "declined", "attended", "absent"]).default("invited"),
  joinedAt: timestamp("joinedAt"),
  leftAt: timestamp("leftAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MeetingParticipant = typeof meetingParticipants.$inferSelect;
export type InsertMeetingParticipant = typeof meetingParticipants.$inferInsert;

// Agendas table
export const agendas = mysqlTable("agendas", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  orderIndex: int("orderIndex").default(0),
  duration: int("duration"),
  status: mysqlEnum("status", ["pending", "inProgress", "completed"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_meeting_agenda").on(table.meetingId),
]));

export type Agenda = typeof agendas.$inferSelect;
export type InsertAgenda = typeof agendas.$inferInsert;

// Documents table
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  meetingId: int("meetingId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  version: int("version").default(1),
  documentType: mysqlEnum("documentType", ["boardPack", "resolution", "minutes", "policy", "other"]).default("other"),
  isConfidential: boolean("isConfidential").default(false),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_org_document").on(table.organizationId),
  index("idx_meeting_document").on(table.meetingId),
]));

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// Document Permissions
export const documentPermissions = mysqlTable("documentPermissions", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  userId: int("userId"),
  permission: mysqlEnum("permission", ["view", "edit", "download", "share", "delete"]).notNull(),
  grantedBy: int("grantedBy").notNull(),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
}, (table) => ([
  index("idx_doc_permission").on(table.documentId),
]));

export type DocumentPermission = typeof documentPermissions.$inferSelect;
export type InsertDocumentPermission = typeof documentPermissions.$inferInsert;

// Votes table
export const votes = mysqlTable("votes", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  meetingId: int("meetingId"),
  resolutionId: int("resolutionId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  votingMethod: mysqlEnum("votingMethod", ["unanimous", "majority", "weighted", "plurality"]).default("majority"),
  status: mysqlEnum("status", ["open", "closed", "cancelled"]).default("open"),
  result: mysqlEnum("result", ["passed", "failed", "abstained", "pending"]).default("pending"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_org_vote").on(table.organizationId),
  index("idx_meeting_vote").on(table.meetingId),
]));

export type Vote = typeof votes.$inferSelect;
export type InsertVote = typeof votes.$inferInsert;

// Vote Ballots
export const voteBallots = mysqlTable("voteBallots", {
  id: int("id").autoincrement().primaryKey(),
  voteId: int("voteId").notNull(),
  userId: int("userId").notNull(),
  choice: mysqlEnum("choice", ["yes", "no", "abstain"]).notNull(),
  weight: decimal("weight", { precision: 10, scale: 2 }).default("1"),
  votedAt: timestamp("votedAt").defaultNow().notNull(),
}, (table) => ([
  index("idx_vote_ballot").on(table.voteId),
]));

export type VoteBallot = typeof voteBallots.$inferSelect;
export type InsertVoteBallot = typeof voteBallots.$inferInsert;

// Resolutions table
export const resolutions = mysqlTable("resolutions", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  meetingId: int("meetingId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "approved", "rejected", "executed"]).default("draft"),
  requiresSignature: boolean("requiresSignature").default(true),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_org_resolution").on(table.organizationId),
]));

export type Resolution = typeof resolutions.$inferSelect;
export type InsertResolution = typeof resolutions.$inferInsert;

// Digital Signatures
export const signatures = mysqlTable("signatures", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId"),
  resolutionId: int("resolutionId"),
  userId: int("userId").notNull(),
  signatureProviderId: varchar("signatureProviderId", { length: 50 }), // DocuSign, SignNow, etc.
  envelopeId: varchar("envelopeId", { length: 255 }), // Provider's envelope/document ID
  signatureData: longtext("signatureData"),
  status: mysqlEnum("status", ["pending", "signed", "rejected", "expired", "cancelled"]).default("pending"),
  signedAt: timestamp("signedAt"),
  documentUrl: varchar("documentUrl", { length: 500 }), // URL to signed document
  auditTrail: json("auditTrail").$type<Record<string, unknown>>(), // Signature audit trail
  rejectionReason: text("rejectionReason"), // Reason if rejected
  expiresAt: timestamp("expiresAt"), // When signature request expires
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_doc_signature").on(table.documentId),
  index("idx_resolution_signatures").on(table.resolutionId),
  index("idx_user_signatures").on(table.userId),
  index("idx_signature_status").on(table.status),
  index("idx_envelope_id").on(table.envelopeId),
]));

export type Signature = typeof signatures.$inferSelect;
export type InsertSignature = typeof signatures.$inferInsert;

// Meeting Minutes
export const minutes = mysqlTable("minutes", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  content: longtext("content"),
  status: mysqlEnum("status", ["draft", "approved", "published"]).default("draft"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_meeting_minutes").on(table.meetingId),
]));

export type Minutes = typeof minutes.$inferSelect;
export type InsertMinutes = typeof minutes.$inferInsert;

// Action Items
export const actionItems = mysqlTable("actionItems", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  minutesId: int("minutesId"),
  description: text("description").notNull(),
  assignedTo: int("assignedTo"),
  dueDate: timestamp("dueDate"),
  status: mysqlEnum("status", ["open", "inProgress", "completed", "cancelled"]).default("open"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_meeting_action").on(table.meetingId),
]));

export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = typeof actionItems.$inferInsert;

// Board Assessments
export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assessmentType: mysqlEnum("assessmentType", ["selfAssessment", "peerReview", "boardPerformance"]).default("boardPerformance"),
  status: mysqlEnum("status", ["draft", "active", "completed"]).default("draft"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_org_assessment").on(table.organizationId),
]));

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;

// Assessment Responses
export const assessmentResponses = mysqlTable("assessmentResponses", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull(),
  userId: int("userId").notNull(),
  responses: json("responses").$type<Record<string, any>>(),
  score: decimal("score", { precision: 5, scale: 2 }),
  submittedAt: timestamp("submittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("idx_assessment_response").on(table.assessmentId),
]));

export type AssessmentResponse = typeof assessmentResponses.$inferSelect;
export type InsertAssessmentResponse = typeof assessmentResponses.$inferInsert;

// Compliance Logs
export const complianceLogs = mysqlTable("complianceLogs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  framework: mysqlEnum("framework", ["kingIV", "ohada", "popia", "ndpr"]).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["compliant", "nonCompliant", "pending"]).default("pending"),
  actionRequired: boolean("actionRequired").default(false),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("idx_org_compliance").on(table.organizationId),
  index("idx_compliance_framework").on(table.framework),
]));

export type ComplianceLog = typeof complianceLogs.$inferSelect;
export type InsertComplianceLog = typeof complianceLogs.$inferInsert;

// Audit Logs
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId"),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: int("entityId"),
  changes: json("changes").$type<Record<string, any>>(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("idx_org_audit").on(table.organizationId),
  index("idx_audit_action").on(table.action),
]));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// Notifications
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["meetingReminder", "approvalRequired", "documentDeadline", "complianceReminder", "voteOpened", "other"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  relatedEntityType: varchar("relatedEntityType", { length: 100 }),
  relatedEntityId: int("relatedEntityId"),
  isRead: boolean("isRead").default(false),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("idx_user_notification").on(table.userId),
  index("idx_notification_type").on(table.type),
]));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Subscription Plans
export const subscriptionPlans = mysqlTable("subscriptionPlans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  monthlyPrice: decimal("monthlyPrice", { precision: 10, scale: 2 }).notNull(),
  yearlyPrice: decimal("yearlyPrice", { precision: 10, scale: 2 }),
  features: json("features").$type<string[]>(),
  maxUsers: int("maxUsers"),
  maxMeetings: int("maxMeetings"),
  maxDocuments: int("maxDocuments"),
  maxStorage: int("maxStorage"),
  priority: int("priority").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

// Organization Subscriptions
export const organizationSubscriptions = mysqlTable("organizationSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  planId: int("planId").notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "expired", "suspended"]).default("active"),
  billingCycle: mysqlEnum("billingCycle", ["monthly", "yearly"]).default("monthly"),
  currentPeriodStart: timestamp("currentPeriodStart").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  cancelledAt: timestamp("cancelledAt"),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  // Storage tracking (in bytes)
  storageUsed: bigint("storageUsed", { mode: "number" }).default(0).notNull(),
  storageLimit: bigint("storageLimit", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_org_subscription").on(table.organizationId),
]));

export type OrganizationSubscription = typeof organizationSubscriptions.$inferSelect;
export type InsertOrganizationSubscription = typeof organizationSubscriptions.$inferInsert;

// Feature Access Control
export const featureAccess = mysqlTable("featureAccess", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  feature: varchar("feature", { length: 100 }).notNull(),
  isEnabled: boolean("isEnabled").default(true),
  limit: int("limit"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("idx_plan_feature").on(table.planId),
]));

export type FeatureAccess = typeof featureAccess.$inferSelect;
export type InsertFeatureAccess = typeof featureAccess.$inferInsert;

// Invoices
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  subscriptionId: int("subscriptionId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: mysqlEnum("status", ["draft", "sent", "paid", "failed", "cancelled"]).default("draft"),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).unique(),
  dueDate: timestamp("dueDate"),
  paidAt: timestamp("paidAt"),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_org_invoice").on(table.organizationId),
]));

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// Tasks table for tracking action items and assignments
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  meetingId: int("meetingId"),
  actionItemId: int("actionItemId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignedTo: int("assignedTo"),
  createdBy: int("createdBy").notNull(),
  status: mysqlEnum("status", ["open", "inProgress", "completed", "cancelled"]).default("open"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_org_tasks").on(table.organizationId),
  index("idx_meeting_tasks").on(table.meetingId),
  index("idx_assigned_tasks").on(table.assignedTo),
  index("idx_task_status").on(table.status),
]));

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// Task comments for collaboration
export const taskComments = mysqlTable("taskComments", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  userId: int("userId").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_task_comments").on(table.taskId),
]));

export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = typeof taskComments.$inferInsert;

// Task notifications
export const taskNotifications = mysqlTable("taskNotifications", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["assigned", "updated", "commented", "completed", "overdue"]).notNull(),
  message: text("message"),
  isRead: boolean("isRead").default(false),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("idx_task_notifications").on(table.taskId),
  index("idx_user_notifications").on(table.userId),
]));

export type TaskNotification = typeof taskNotifications.$inferSelect;
export type InsertTaskNotification = typeof taskNotifications.$inferInsert;


// Email Verification Tokens table
export const emailVerificationTokens = mysqlTable("emailVerificationTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("idx_user_verification").on(table.userId),
  index("idx_token_verification").on(table.token),
  index("idx_expires_at").on(table.expiresAt),
]));

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;


// Remember Me Tokens table
// Allows users to maintain persistent sessions without re-authenticating
// Tokens are long-lived (30 days) and stored securely
export const rememberMeTokens = mysqlTable("rememberMeTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  tokenHash: varchar("tokenHash", { length: 255 }).notNull(), // Hash of token for security
  userAgent: text("userAgent"), // Browser/device info for validation
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  expiresAt: timestamp("expiresAt").notNull(), // 30 days from creation
  lastUsedAt: timestamp("lastUsedAt"), // Track when token was last used
  revokedAt: timestamp("revokedAt"), // Null if active, set when revoked
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("idx_user_remember").on(table.userId),
  index("idx_token_remember").on(table.token),
  index("idx_expires_remember").on(table.expiresAt),
]));

export type RememberMeToken = typeof rememberMeTokens.$inferSelect;
export type InsertRememberMeToken = typeof rememberMeTokens.$inferInsert;



// MFA Secrets table for multi-factor authentication
export const mfaSecrets = mysqlTable("mfaSecrets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  secret: varchar("secret", { length: 255 }).notNull(), // TOTP secret
  backupCodes: json("backupCodes").$type<string[]>(), // Array of backup codes
  enabled: boolean("enabled").default(false),
  enabledAt: timestamp("enabledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_user_mfa").on(table.userId),
]));

export type MFASecret = typeof mfaSecrets.$inferSelect;
export type InsertMFASecret = typeof mfaSecrets.$inferInsert;

// MFA Attempts table for rate limiting
export const mfaAttempts = mysqlTable("mfaAttempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  attempts: int("attempts").default(0),
  lastAttemptAt: timestamp("lastAttemptAt"),
  lockedUntil: timestamp("lockedUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_user_mfa_attempts").on(table.userId),
]));

export type MFAAttempt = typeof mfaAttempts.$inferSelect;
export type InsertMFAAttempt = typeof mfaAttempts.$inferInsert;

// Meeting Collaborations table for real-time collaboration
export const meetingCollaborations = mysqlTable("meetingCollaborations", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  currentPage: int("currentPage").default(0),
  currentScrollPosition: int("currentScrollPosition").default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_meeting_collaboration").on(table.meetingId),
]));

export type MeetingCollaboration = typeof meetingCollaborations.$inferSelect;
export type InsertMeetingCollaboration = typeof meetingCollaborations.$inferInsert;

// Annotations table for meeting annotations
export const annotations = mysqlTable("annotations", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  documentId: int("documentId"),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["draw", "highlight", "arrow", "text", "underline"]).notNull(),
  coordinates: json("coordinates").$type<Record<string, unknown>>(), // x, y, width, height, etc.
  color: varchar("color", { length: 7 }), // Hex color code
  content: text("content"), // For text annotations
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("idx_meeting_annotations").on(table.meetingId),
  index("idx_document_annotations").on(table.documentId),
  index("idx_user_annotations").on(table.userId),
]));

export type Annotation = typeof annotations.$inferSelect;
export type InsertAnnotation = typeof annotations.$inferInsert;


// Password Reset Tokens table
// Stores secure tokens for password reset requests
// Tokens expire after 1 hour and are marked as used after successful reset
export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  used: boolean("used").default(false).notNull(),
  usedAt: timestamp("usedAt"),
  expiresAt: timestamp("expiresAt").notNull(), // 1 hour from creation
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("idx_user_reset").on(table.userId),
  index("idx_token_reset").on(table.token),
  index("idx_expires_reset").on(table.expiresAt),
]));

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
