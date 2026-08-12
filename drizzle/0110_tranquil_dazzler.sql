CREATE TABLE `lead_generation_daily_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`snapshotDate` varchar(10) NOT NULL,
	`leadsCreated` int NOT NULL DEFAULT 0,
	`websiteLeads` int NOT NULL DEFAULT 0,
	`respondedWithin24h` int NOT NULL DEFAULT 0,
	`quotesCreated` int NOT NULL DEFAULT 0,
	`quotesSent` int NOT NULL DEFAULT 0,
	`quotesViewed` int NOT NULL DEFAULT 0,
	`quotesApproved` int NOT NULL DEFAULT 0,
	`reviewRequestsSent` int NOT NULL DEFAULT 0,
	`sourceBreakdown` text NOT NULL DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lead_generation_daily_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_generation_tracking_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`trackingStartedAt` timestamp NOT NULL DEFAULT (now()),
	`schedule_cron_task_uid` varchar(65),
	`targetLeads30d` int NOT NULL DEFAULT 8,
	`targetFirstResponseRate` int NOT NULL DEFAULT 90,
	`targetQuoteSentRate` int NOT NULL DEFAULT 90,
	`targetQuoteViewRate` int NOT NULL DEFAULT 60,
	`targetReviewRequests30d` int NOT NULL DEFAULT 4,
	`lastSnapshotAt` timestamp,
	`lastRunStatus` varchar(32),
	`lastRunError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lead_generation_tracking_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `lead_generation_tracking_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `discountMilitaryVeteranPct` int DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `discountFirstTimePct` int DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `discountReferralPct` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `discountRepeatCustomerPct` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `discountOffSeasonPct` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `discountNonprofitGovPct` int DEFAULT 0 NOT NULL;