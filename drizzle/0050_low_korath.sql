ALTER TABLE `ad_spend` MODIFY COLUMN `platform` enum('facebook','instagram','x','linkedin','google','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `social_posts` ADD `liPostId` varchar(200);--> statement-breakpoint
ALTER TABLE `social_posts` ADD `igDraft` text;--> statement-breakpoint
ALTER TABLE `social_posts` ADD `xDraft` text;--> statement-breakpoint
ALTER TABLE `social_posts` ADD `liDraft` text;--> statement-breakpoint
ALTER TABLE `social_posts` ADD `googleHeadline` varchar(255);--> statement-breakpoint
ALTER TABLE `social_posts` ADD `googleDescription` varchar(500);--> statement-breakpoint
ALTER TABLE `social_posts` ADD `googleDraft` text;