CREATE TABLE `quote_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`customerName` varchar(255),
	`customerEmail` varchar(320),
	`service` varchar(100),
	`county` varchar(100),
	`acreage` varchar(50),
	`aiResult` text NOT NULL,
	`status` enum('saved','sent','archived') NOT NULL DEFAULT 'saved',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quote_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `westTnMobilizationFee` int;