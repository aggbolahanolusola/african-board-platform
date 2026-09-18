CREATE TABLE `annotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`documentId` int,
	`userId` int NOT NULL,
	`type` enum('draw','highlight','arrow','text','underline') NOT NULL,
	`coordinates` json,
	`color` varchar(7),
	`content` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `annotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meetingCollaborations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`currentPage` int DEFAULT 0,
	`currentScrollPosition` int DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meetingCollaborations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mfaAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`attempts` int DEFAULT 0,
	`lastAttemptAt` timestamp,
	`lockedUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mfaAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mfaSecrets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`secret` varchar(255) NOT NULL,
	`backupCodes` json,
	`enabled` boolean DEFAULT false,
	`enabledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mfaSecrets_id` PRIMARY KEY(`id`),
	CONSTRAINT `mfaSecrets_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `signatures` MODIFY COLUMN `documentId` int;--> statement-breakpoint
ALTER TABLE `signatures` MODIFY COLUMN `signedAt` timestamp;--> statement-breakpoint
ALTER TABLE `signatures` MODIFY COLUMN `status` enum('pending','signed','rejected','expired','cancelled') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `signatures` ADD `signatureProviderId` varchar(50);--> statement-breakpoint
ALTER TABLE `signatures` ADD `envelopeId` varchar(255);--> statement-breakpoint
ALTER TABLE `signatures` ADD `documentUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `signatures` ADD `auditTrail` json;--> statement-breakpoint
ALTER TABLE `signatures` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `signatures` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `signatures` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
CREATE INDEX `idx_meeting_annotations` ON `annotations` (`meetingId`);--> statement-breakpoint
CREATE INDEX `idx_document_annotations` ON `annotations` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_user_annotations` ON `annotations` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_meeting_collaboration` ON `meetingCollaborations` (`meetingId`);--> statement-breakpoint
CREATE INDEX `idx_user_mfa_attempts` ON `mfaAttempts` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_user_mfa` ON `mfaSecrets` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_resolution_signatures` ON `signatures` (`resolutionId`);--> statement-breakpoint
CREATE INDEX `idx_user_signatures` ON `signatures` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_signature_status` ON `signatures` (`status`);--> statement-breakpoint
CREATE INDEX `idx_envelope_id` ON `signatures` (`envelopeId`);