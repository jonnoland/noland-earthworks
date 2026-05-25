ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `rowClearingBaseRate` int NOT NULL DEFAULT 6;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `stumpGrindingPerStump` int NOT NULL DEFAULT 200;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `apdRowClearing` varchar(10) NOT NULL DEFAULT '500';