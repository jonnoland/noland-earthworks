CREATE TABLE IF NOT EXISTS `route_vehicle_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`truck` text NOT NULL,
	`trailer` text NOT NULL,
	`loadDescription` text NOT NULL,
	`towingMpg` decimal(5,2) NOT NULL DEFAULT '9.00',
	`towingTimeMultiplier` decimal(5,2) NOT NULL DEFAULT '1.15',
	`unpavedAverageMph` decimal(5,1) NOT NULL DEFAULT '18.0',
	`isDefault` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `route_vehicle_profiles_id` PRIMARY KEY(`id`)
);
