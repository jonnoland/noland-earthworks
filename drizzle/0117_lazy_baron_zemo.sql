ALTER TABLE `email_subscribers` ADD `areaInterest` varchar(255);--> statement-breakpoint
ALTER TABLE `email_subscribers` ADD `notifyOnExpansion` boolean DEFAULT false NOT NULL;