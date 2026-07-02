CREATE TABLE `prospecting_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(64) NOT NULL,
	`url` text NOT NULL,
	`contactName` varchar(255),
	`contactInfo` varchar(255),
	`location` varchar(255),
	`summary` text NOT NULL,
	`reachOutDraft` text,
	`status` varchar(32) NOT NULL DEFAULT 'new',
	`postSnippet` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospecting_leads_id` PRIMARY KEY(`id`)
);
