CREATE TABLE `recurring_blackout_days` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dayOfWeek` int NOT NULL,
	`label` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recurring_blackout_days_id` PRIMARY KEY(`id`),
	CONSTRAINT `recurring_blackout_days_dayOfWeek_unique` UNIQUE(`dayOfWeek`)
);
--> statement-breakpoint
ALTER TABLE `ops_leads` ADD `visitConfirmedAt` timestamp;