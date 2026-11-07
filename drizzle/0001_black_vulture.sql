CREATE TABLE `actionItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`minutesId` int,
	`description` text NOT NULL,
	`assignedTo` int,
	`dueDate` timestamp,
	`status` enum('open','inProgress','completed','cancelled') DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `actionItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agendas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`orderIndex` int DEFAULT 0,
	`duration` int,
	`status` enum('pending','inProgress','completed') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agendas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assessmentResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`userId` int NOT NULL,
	`responses` json,
	`score` decimal(5,2),
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessmentResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`assessmentType` enum('selfAssessment','peerReview','boardPerformance') DEFAULT 'boardPerformance',
	`status` enum('draft','active','completed') DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int,
	`action` varchar(255) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int,
	`changes` json,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complianceLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`framework` enum('kingIV','ohada','popia','ndpr') NOT NULL,
	`action` varchar(255) NOT NULL,
	`description` text,
	`status` enum('compliant','nonCompliant','pending') DEFAULT 'pending',
	`actionRequired` boolean DEFAULT false,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `complianceLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documentPermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`userId` int,
	`permission` enum('view','edit','download','share','delete') NOT NULL,
	`grantedBy` int NOT NULL,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentPermissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`meetingId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`version` int DEFAULT 1,
	`documentType` enum('boardPack','resolution','minutes','policy','other') DEFAULT 'other',
	`isConfidential` boolean DEFAULT false,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meetingParticipants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('invited','accepted','declined','attended','absent') DEFAULT 'invited',
	`joinedAt` timestamp,
	`leftAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meetingParticipants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`scheduledAt` timestamp NOT NULL,
	`endTime` timestamp,
	`timezone` varchar(50) DEFAULT 'UTC',
	`location` varchar(255),
	`meetingType` enum('board','committee','annual','special') DEFAULT 'board',
	`status` enum('scheduled','inProgress','completed','cancelled') DEFAULT 'scheduled',
	`recordingUrl` varchar(500),
	`transcriptionUrl` varchar(500),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `minutes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`content` longtext,
	`status` enum('draft','approved','published') DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `minutes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('meetingReminder','approvalRequired','documentDeadline','complianceReminder','voteOpened','other') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`relatedEntityType` varchar(100),
	`relatedEntityId` int,
	`isRead` boolean DEFAULT false,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`country` varchar(100),
	`timezone` varchar(50) DEFAULT 'UTC',
	`complianceFrameworks` json,
	`dataResidency` varchar(100) DEFAULT 'regional',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resolutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`meetingId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('draft','approved','rejected','executed') DEFAULT 'draft',
	`requiresSignature` boolean DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resolutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`resolutionId` int,
	`userId` int NOT NULL,
	`signatureData` longtext,
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('pending','signed','rejected') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voteBallots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`voteId` int NOT NULL,
	`userId` int NOT NULL,
	`choice` enum('yes','no','abstain') NOT NULL,
	`weight` decimal(10,2) DEFAULT '1',
	`votedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `voteBallots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`meetingId` int,
	`resolutionId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`votingMethod` enum('unanimous','majority','weighted','plurality') DEFAULT 'majority',
	`status` enum('open','closed','cancelled') DEFAULT 'open',
	`result` enum('passed','failed','abstained','pending') DEFAULT 'pending',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `userRole` enum('boardMember','secretary','administrator','complianceOfficer') DEFAULT 'boardMember';--> statement-breakpoint
CREATE INDEX `idx_meeting_action` ON `actionItems` (`meetingId`);--> statement-breakpoint
CREATE INDEX `idx_meeting_agenda` ON `agendas` (`meetingId`);--> statement-breakpoint
CREATE INDEX `idx_assessment_response` ON `assessmentResponses` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `idx_org_assessment` ON `assessments` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_org_audit` ON `auditLogs` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_audit_action` ON `auditLogs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_org_compliance` ON `complianceLogs` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_compliance_framework` ON `complianceLogs` (`framework`);--> statement-breakpoint
CREATE INDEX `idx_doc_permission` ON `documentPermissions` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_org_document` ON `documents` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_meeting_document` ON `documents` (`meetingId`);--> statement-breakpoint
CREATE INDEX `idx_org_meeting` ON `meetings` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_meeting_status` ON `meetings` (`status`);--> statement-breakpoint
CREATE INDEX `idx_meeting_minutes` ON `minutes` (`meetingId`);--> statement-breakpoint
CREATE INDEX `idx_user_notification` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_notification_type` ON `notifications` (`type`);--> statement-breakpoint
CREATE INDEX `idx_org_resolution` ON `resolutions` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_doc_signature` ON `signatures` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_vote_ballot` ON `voteBallots` (`voteId`);--> statement-breakpoint
CREATE INDEX `idx_org_vote` ON `votes` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_meeting_vote` ON `votes` (`meetingId`);