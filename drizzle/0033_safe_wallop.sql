ALTER TABLE `ai_pricing_settings` ADD `stumpGrindingPerStump` int DEFAULT 150 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `debrisHaulingPerLoad` int DEFAULT 450 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `volumeDiscount3to5Pct` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `volumeDiscount5to10Pct` int DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `volumeDiscount10plusPct` int DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `apdForestryMulching` varchar(10) DEFAULT '1.5' NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `apdLandClearing` varchar(10) DEFAULT '1.2' NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `apdRowClearing` varchar(10) DEFAULT '1.25' NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `apdBrushHogging` varchar(10) DEFAULT '8.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `seasonalPeakUpliftPct` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `seasonalSlowReductionPct` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_pricing_settings` ADD `complexityPremiumPct` int DEFAULT 15 NOT NULL;