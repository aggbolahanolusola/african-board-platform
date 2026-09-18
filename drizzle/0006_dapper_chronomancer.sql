ALTER TABLE `users` ADD `passwordHash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isEmailVerified` boolean DEFAULT false NOT NULL;