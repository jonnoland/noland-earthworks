CREATE TABLE `portal_add_on_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(200) NOT NULL,
	`description` text,
	`estimateCents` int NOT NULL DEFAULT 0,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portal_add_on_options_id` PRIMARY KEY(`id`)
);
