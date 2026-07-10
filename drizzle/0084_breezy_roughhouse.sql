CREATE TABLE `saved_routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`originAddress` text NOT NULL,
	`destinationAddress` text NOT NULL,
	`originLatLng` text,
	`destinationLatLng` text,
	`distanceMiles` varchar(32),
	`durationText` varchar(64),
	`weighStationIds` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_routes_id` PRIMARY KEY(`id`)
);
