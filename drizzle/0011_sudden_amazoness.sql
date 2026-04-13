CREATE TABLE `automation_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`automationsEnabled` boolean NOT NULL DEFAULT false,
	`newLeadMaxMinutes` int NOT NULL DEFAULT 10080,
	`contactedMaxDays` int NOT NULL DEFAULT 14,
	`siteVisitMaxDays` int NOT NULL DEFAULT 7,
	`quoteSentMaxDays` int NOT NULL DEFAULT 14,
	`followUpMaxDays` int NOT NULL DEFAULT 30,
	`coldNurtureMaxDays` int NOT NULL DEFAULT 90,
	`followUpIntervalDays` int NOT NULL DEFAULT 60,
	`maxTouchesBeforeClose` int NOT NULL DEFAULT 6,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(200) NOT NULL DEFAULT 'Noland Earthworks, LLC',
	`phone` varchar(30) DEFAULT '(615) 406-4819',
	`email` varchar(200) DEFAULT 'jonnoland@nolandearthworks.com',
	`address` varchar(300) DEFAULT '93 Halliburton Road',
	`city` varchar(100) DEFAULT 'Vanleer',
	`state` varchar(50) DEFAULT 'Tennessee',
	`zip` varchar(20) DEFAULT '37181',
	`website` varchar(300) DEFAULT 'https://www.nolandearthworks.com',
	`googleReviewUrl` varchar(500) DEFAULT 'https://g.page/r/CcglMAMbtQInEAI/review',
	`defaultTaxRate` varchar(10) DEFAULT '0',
	`brandColor` varchar(20) DEFAULT '#f97316',
	`licenseNumbers` text,
	`logoLight` varchar(500),
	`logoDark` varchar(500),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_settings_id` PRIMARY KEY(`id`)
);
