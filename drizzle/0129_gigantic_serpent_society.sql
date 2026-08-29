CREATE TABLE `quote_insurance_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`label` varchar(160) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`storageUrl` varchar(1200) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`sizeBytes` int NOT NULL,
	`expiresAt` timestamp,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quote_insurance_library_id` PRIMARY KEY(`id`),
	CONSTRAINT `quote_insurance_library_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
ALTER TABLE `native_quotes` ADD `aiCostReview` text;--> statement-breakpoint
ALTER TABLE `native_quotes` ADD `aiCostReviewUpdatedAt` timestamp;