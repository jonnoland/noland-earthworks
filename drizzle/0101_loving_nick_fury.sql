CREATE TABLE `native_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(30),
	`address` varchar(500),
	`notes` text,
	`jobCount` int NOT NULL DEFAULT 0,
	`totalSpentCents` int NOT NULL DEFAULT 0,
	`source` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `native_clients_id` PRIMARY KEY(`id`)
);
