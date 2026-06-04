CREATE TABLE `seo_articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetKeyword` varchar(300) NOT NULL,
	`title` varchar(500) NOT NULL,
	`metaDescription` varchar(500),
	`bodyMarkdown` text NOT NULL,
	`wordCount` int,
	`status` enum('draft','ready','published') NOT NULL DEFAULT 'draft',
	`notes` text,
	`keywordId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seo_keywords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyword` varchar(300) NOT NULL,
	`intent` varchar(50) NOT NULL DEFAULT 'informational',
	`difficulty` varchar(20) NOT NULL DEFAULT 'medium',
	`volumeRange` varchar(50),
	`rationale` text,
	`contentType` varchar(100),
	`targeted` boolean NOT NULL DEFAULT false,
	`saved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seo_keywords_id` PRIMARY KEY(`id`)
);
