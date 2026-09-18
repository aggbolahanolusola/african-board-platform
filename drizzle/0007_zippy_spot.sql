CREATE TABLE `rememberMeTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`tokenHash` varchar(255) NOT NULL,
	`userAgent` text,
	`ipAddress` varchar(45),
	`expiresAt` timestamp NOT NULL,
	`lastUsedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rememberMeTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `rememberMeTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `idx_user_remember` ON `rememberMeTokens` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_token_remember` ON `rememberMeTokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_expires_remember` ON `rememberMeTokens` (`expiresAt`);