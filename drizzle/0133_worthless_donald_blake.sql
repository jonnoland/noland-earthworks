CREATE TABLE `native_quote_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`revisionNumber` int NOT NULL,
	`snapshotJson` text NOT NULL,
	`sentAt` timestamp NOT NULL,
	`viewedAt` timestamp,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `native_quote_revisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `native_quote_revisions_quote_revision_unique` UNIQUE(`quoteId`,`revisionNumber`)
);
--> statement-breakpoint
CREATE INDEX `native_quote_revisions_quote_sent_idx` ON `native_quote_revisions` (`quoteId`,`sentAt`);