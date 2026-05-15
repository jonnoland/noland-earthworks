CREATE TABLE `facebook_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` varchar(64) NOT NULL,
	`formId` varchar(64),
	`pageId` varchar(64),
	`adId` varchar(64),
	`adSetId` varchar(64),
	`campaignId` varchar(64),
	`fields` text NOT NULL DEFAULT ('{}'),
	`name` varchar(255),
	`email` varchar(320),
	`phone` varchar(50),
	`status` enum('new','contacted','converted','lost') NOT NULL DEFAULT 'new',
	`notes` text,
	`createdTime` timestamp NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facebook_leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `facebook_leads_leadId_unique` UNIQUE(`leadId`)
);
--> statement-breakpoint
CREATE TABLE `google_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewId` varchar(255) NOT NULL,
	`authorName` varchar(255),
	`authorPhotoUrl` varchar(512),
	`rating` int NOT NULL,
	`comment` text,
	`createTime` varchar(64),
	`updateTime` varchar(64),
	`replyComment` text,
	`replyTime` varchar(64),
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `google_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `google_reviews_reviewId_unique` UNIQUE(`reviewId`)
);
--> statement-breakpoint
CREATE TABLE `google_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`scope` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `google_tokens_id` PRIMARY KEY(`id`)
);
