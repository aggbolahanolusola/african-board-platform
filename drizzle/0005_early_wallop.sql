CREATE TABLE `emailVerificationTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailVerificationTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `emailVerificationTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `idx_user_verification` ON `emailVerificationTokens` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_token_verification` ON `emailVerificationTokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_expires_at` ON `emailVerificationTokens` (`expiresAt`);