ALTER TABLE `field_quotes` ADD `linearFeet` decimal(10,2);--> statement-breakpoint
ALTER TABLE `field_quotes` ADD `quantitySource` enum('measured','acreage_estimate');--> statement-breakpoint
ALTER TABLE `field_quotes` ADD `sourceAcreage` decimal(8,2);--> statement-breakpoint
ALTER TABLE `field_quotes` ADD `clearingWidthFeet` decimal(8,2);