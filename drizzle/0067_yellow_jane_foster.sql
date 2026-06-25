CREATE TABLE `ad_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`monthLabel` varchar(30) NOT NULL,
	`season` varchar(20),
	`theme` varchar(255),
	`goal` text,
	`primaryMessage` text,
	`adIdeas` json,
	`suggestedDates` json,
	`notes` text,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`generatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ad_campaigns_id` PRIMARY KEY(`id`)
);
