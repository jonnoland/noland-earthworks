ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `forestryMulchingBaseRate` int NOT NULL DEFAULT 1300;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `landClearingBaseRate` int NOT NULL DEFAULT 1100;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `brushHoggingBaseRate` int NOT NULL DEFAULT 135;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `rowClearingBaseRate` int NOT NULL DEFAULT 1800;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `trailCuttingBaseRate` int NOT NULL DEFAULT 2000;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `vegetationMgmtBaseRate` int NOT NULL DEFAULT 1500;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` MODIFY COLUMN `minimumJobTotal` int NOT NULL DEFAULT 1800;