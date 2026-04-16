CREATE TABLE `visit_blackout_dates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visit_blackout_dates_id` PRIMARY KEY(`id`),
	CONSTRAINT `visit_blackout_dates_date_unique` UNIQUE(`date`)
);
