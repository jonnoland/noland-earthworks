ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `forestryMulchingBaseRate` int NOT NULL DEFAULT 2000;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `landClearingBaseRate` int NOT NULL DEFAULT 2200;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `brushHoggingBaseRate` int NOT NULL DEFAULT 175;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `rowClearingBaseRate` int NOT NULL DEFAULT 1400;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `mobilizationFee` int NOT NULL DEFAULT 450;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `minimumJobTotal` int NOT NULL DEFAULT 1200;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `terrainSteepMultiplier` varchar(10) NOT NULL DEFAULT '1.40';--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `volumeDiscount10plusPct` int NOT NULL DEFAULT 10;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `apdRowClearing` varchar(10) NOT NULL DEFAULT '3.0';