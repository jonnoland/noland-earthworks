CREATE TABLE `jobber_revenue_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` varchar(256) NOT NULL,
	`invoiceNumber` int,
	`invoiceStatus` varchar(50),
	`total` decimal(10,2) NOT NULL DEFAULT '0',
	`balance` decimal(10,2) NOT NULL DEFAULT '0',
	`clientName` varchar(255),
	`subject` varchar(500),
	`issuedDate` timestamp,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jobber_revenue_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobber_revenue_cache_invoiceId_unique` UNIQUE(`invoiceId`)
);
--> statement-breakpoint
CREATE TABLE `morning_briefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`content` text NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `morning_briefs_id` PRIMARY KEY(`id`),
	CONSTRAINT `morning_briefs_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `review_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int,
	`jobberJobId` varchar(256),
	`clientPhone` varchar(50) NOT NULL,
	`clientName` varchar(255),
	`jobDescription` varchar(500),
	`twilioSid` varchar(64),
	`status` varchar(20) NOT NULL DEFAULT 'sent',
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `review_requests_id` PRIMARY KEY(`id`)
);
