ALTER TABLE `social_posts` ADD `scheduledAt` timestamp;--> statement-breakpoint
ALTER TABLE `social_posts` ADD `status` varchar(50) DEFAULT 'draft' NOT NULL;