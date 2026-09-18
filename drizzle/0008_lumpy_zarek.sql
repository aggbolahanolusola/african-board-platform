ALTER TABLE `organizationSubscriptions` ADD `storageUsed` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `organizationSubscriptions` ADD `storageLimit` bigint NOT NULL;