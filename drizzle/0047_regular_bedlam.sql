CREATE TABLE `ad_spend` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('facebook','instagram','x','google','clickgrow','other') NOT NULL,
	`component` varchar(100) NOT NULL,
	`amountCents` int NOT NULL,
	`notes` text,
	`spentAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ad_spend_id` PRIMARY KEY(`id`)
);
