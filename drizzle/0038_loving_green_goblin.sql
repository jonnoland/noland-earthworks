CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(128) NOT NULL,
	`visitorName` varchar(255),
	`visitorEmail` varchar(320),
	`visitorPhone` varchar(50),
	`leadCreated` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_sessions_sessionToken_unique` UNIQUE(`sessionToken`)
);
--> statement-breakpoint
CREATE TABLE `job_cost_estimates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`leadId` int,
	`service` varchar(100) NOT NULL,
	`acreage` decimal(8,2),
	`terrain` varchar(100),
	`vegetationDensity` varchar(100),
	`accessDifficulty` varchar(100),
	`mobilizationMiles` int,
	`notes` text,
	`estimatedHours` decimal(8,2),
	`estimatedDays` decimal(8,2),
	`fuelCost` decimal(10,2),
	`mobilizationCost` decimal(10,2),
	`laborCost` decimal(10,2),
	`equipmentCost` decimal(10,2),
	`totalInternalCost` decimal(10,2),
	`customerPriceLow` decimal(10,2),
	`customerPriceHigh` decimal(10,2),
	`marginPct` decimal(5,2),
	`aiSummary` text,
	`aiWarnings` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_cost_estimates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ops_leads` ADD `aiScore` enum('strong','marginal','weak');--> statement-breakpoint
ALTER TABLE `ops_leads` ADD `aiSummary` text;--> statement-breakpoint
ALTER TABLE `ops_leads` ADD `aiFlags` text;--> statement-breakpoint
ALTER TABLE `ops_leads` ADD `aiDraftResponse` text;--> statement-breakpoint
ALTER TABLE `quote_submissions` ADD `aiScore` enum('strong','marginal','weak');--> statement-breakpoint
ALTER TABLE `quote_submissions` ADD `aiSummary` text;--> statement-breakpoint
ALTER TABLE `quote_submissions` ADD `aiFlags` text;--> statement-breakpoint
ALTER TABLE `quote_submissions` ADD `aiDraftResponse` text;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_sessionId_chat_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `chat_sessions`(`id`) ON DELETE cascade ON UPDATE no action;