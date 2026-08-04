CREATE TABLE `service_faqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceSlug` varchar(100) NOT NULL,
	`question` varchar(500) NOT NULL,
	`answer` text NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_faqs_id` PRIMARY KEY(`id`)
);
