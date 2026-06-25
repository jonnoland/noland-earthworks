ALTER TABLE `ai_pricing_settings` ADD `postClearSeedingPerAcre` int DEFAULT 225 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `fenceLineClearingPerLf` int DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `mulchRedistributionPerAcre` int DEFAULT 175 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `selectiveClearingFlatRate` int DEFAULT 200 NOT NULL;