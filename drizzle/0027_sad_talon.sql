CREATE TABLE `quote_follow_ups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobberQuoteId` varchar(120) NOT NULL,
	`quoteNumber` int,
	`quoteTitle` varchar(255),
	`clientName` varchar(255),
	`cleared` boolean NOT NULL DEFAULT false,
	`clearedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quote_follow_ups_id` PRIMARY KEY(`id`),
	CONSTRAINT `quote_follow_ups_jobberQuoteId_unique` UNIQUE(`jobberQuoteId`)
);
