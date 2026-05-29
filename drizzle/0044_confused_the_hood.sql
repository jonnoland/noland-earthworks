ALTER TABLE `social_posts` ADD `imageUrl` text;--> statement-breakpoint
ALTER TABLE `social_posts` ADD `imageKey` varchar(500);--> statement-breakpoint
ALTER TABLE `social_posts` ADD `fbPostId` varchar(200);--> statement-breakpoint
ALTER TABLE `social_posts` ADD `igPostId` varchar(200);--> statement-breakpoint
ALTER TABLE `social_posts` ADD `postedAt` timestamp;--> statement-breakpoint
ALTER TABLE `social_posts` ADD `adType` varchar(50) DEFAULT 'social';--> statement-breakpoint
ALTER TABLE `social_posts` ADD `headline` varchar(255);