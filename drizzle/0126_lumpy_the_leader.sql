ALTER TABLE `native_quotes` ADD `legacyJobId` int;--> statement-breakpoint
ALTER TABLE `native_quotes` ADD CONSTRAINT `native_quotes_legacyJobId_unique` UNIQUE(`legacyJobId`);