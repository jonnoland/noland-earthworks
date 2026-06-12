ALTER TABLE `crews` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `color` varchar(50) DEFAULT '' NOT NULL;