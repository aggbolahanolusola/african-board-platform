CREATE TABLE `taskComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `taskComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taskNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('assigned','updated','commented','completed','overdue') NOT NULL,
	`message` text,
	`isRead` boolean DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`meetingId` int,
	`actionItemId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`assignedTo` int,
	`createdBy` int NOT NULL,
	`status` enum('open','inProgress','completed','cancelled') DEFAULT 'open',
	`priority` enum('low','medium','high','critical') DEFAULT 'medium',
	`dueDate` timestamp,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_task_comments` ON `taskComments` (`taskId`);--> statement-breakpoint
CREATE INDEX `idx_task_notifications` ON `taskNotifications` (`taskId`);--> statement-breakpoint
CREATE INDEX `idx_user_notifications` ON `taskNotifications` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_org_tasks` ON `tasks` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_meeting_tasks` ON `tasks` (`meetingId`);--> statement-breakpoint
CREATE INDEX `idx_assigned_tasks` ON `tasks` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `idx_task_status` ON `tasks` (`status`);