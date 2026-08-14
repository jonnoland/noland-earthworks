ALTER TABLE `native_quotes` ADD `sourceDetail` varchar(100) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `native_quotes` ADD `fitDecision` varchar(30) DEFAULT 'unreviewed' NOT NULL;--> statement-breakpoint
ALTER TABLE `native_quotes` ADD `nextActionType` varchar(100) DEFAULT 'review_request' NOT NULL;--> statement-breakpoint
ALTER TABLE `native_quotes` ADD `nextActionDueAt` timestamp;--> statement-breakpoint
ALTER TABLE `native_quotes` ADD `lastContactAt` timestamp;--> statement-breakpoint
ALTER TABLE `native_quotes` ADD `visitStatus` varchar(30) DEFAULT 'not_requested' NOT NULL;--> statement-breakpoint
ALTER TABLE `native_quotes` ADD `visitCompletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `native_quotes` ADD `proposalStatus` varchar(30) DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE `native_quotes` ADD `depositStatus` varchar(30) DEFAULT 'not_requested' NOT NULL;--> statement-breakpoint
ALTER TABLE `native_quotes` ADD `finalPaymentStatus` varchar(30) DEFAULT 'not_due' NOT NULL;