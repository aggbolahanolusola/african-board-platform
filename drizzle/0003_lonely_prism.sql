CREATE TABLE `featureAccess` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`feature` varchar(100) NOT NULL,
	`isEnabled` boolean DEFAULT true,
	`limit` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `featureAccess_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`subscriptionId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'USD',
	`status` enum('draft','sent','paid','failed','cancelled') DEFAULT 'draft',
	`invoiceNumber` varchar(50),
	`dueDate` timestamp,
	`paidAt` timestamp,
	`stripeInvoiceId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `organizationSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`planId` int NOT NULL,
	`status` enum('active','cancelled','expired','suspended') DEFAULT 'active',
	`billingCycle` enum('monthly','yearly') DEFAULT 'monthly',
	`currentPeriodStart` timestamp NOT NULL,
	`currentPeriodEnd` timestamp NOT NULL,
	`cancelledAt` timestamp,
	`stripeSubscriptionId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizationSubscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`monthlyPrice` decimal(10,2) NOT NULL,
	`yearlyPrice` decimal(10,2),
	`features` json,
	`maxUsers` int,
	`maxMeetings` int,
	`maxDocuments` int,
	`maxStorage` int,
	`priority` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptionPlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptionPlans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `idx_plan_feature` ON `featureAccess` (`planId`);--> statement-breakpoint
CREATE INDEX `idx_org_invoice` ON `invoices` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_org_subscription` ON `organizationSubscriptions` (`organizationId`);