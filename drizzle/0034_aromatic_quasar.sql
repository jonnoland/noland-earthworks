CREATE TABLE `pending_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`channel` enum('email','sms') NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`subject` varchar(500),
	`body` text NOT NULL,
	`retryCount` int NOT NULL DEFAULT 0,
	`lastAttemptAt` timestamp,
	`lastError` text,
	`context` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pending_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `jobs` ADD `leadId` int;--> statement-breakpoint
ALTER TABLE `ops_leads` ADD `followupCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ops_leads` ADD `leadgenId` varchar(128);