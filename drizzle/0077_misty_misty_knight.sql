ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `rowClearingBaseRate` int NOT NULL DEFAULT 2400;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `apdRowClearing` varchar(10) NOT NULL DEFAULT '1.2';--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `trailCuttingBaseRate` int DEFAULT 2600 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `vegetationMgmtBaseRate` int DEFAULT 1800 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `apdTrailCutting` varchar(10) DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `apdVegetationMgmt` varchar(10) DEFAULT '2.0' NOT NULL;