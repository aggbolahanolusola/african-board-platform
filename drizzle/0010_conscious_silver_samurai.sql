CREATE TABLE `passwordResetTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`usedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passwordResetTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `passwordResetTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `idx_user_reset` ON `passwordResetTokens` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_token_reset` ON `passwordResetTokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_expires_reset` ON `passwordResetTokens` (`expiresAt`);