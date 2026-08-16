CREATE TABLE `stripe_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(128) NOT NULL,
	`eventType` varchar(120) NOT NULL,
	`stripeSessionId` varchar(128),
	`status` enum('received','processed','failed') NOT NULL DEFAULT 'received',
	`attempts` int NOT NULL DEFAULT 1,
	`lastError` text,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stripe_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripe_webhook_events_eventId_unique` UNIQUE(`eventId`)
);
