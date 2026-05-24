CREATE TABLE `ai_pricing_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`forestryMulchingBaseRate` int NOT NULL DEFAULT 800,
	`landClearingBaseRate` int NOT NULL DEFAULT 700,
	`brushHoggingBaseRate` int NOT NULL DEFAULT 150,
	`rowClearingBaseRate` int NOT NULL DEFAULT 600,
	`mobilizationFee` int NOT NULL DEFAULT 350,
	`minimumJobTotal` int NOT NULL DEFAULT 750,
	`densityModerateMultiplier` varchar(10) NOT NULL DEFAULT '1.25',
	`densityHeavyMultiplier` varchar(10) NOT NULL DEFAULT '1.60',
	`terrainRollingMultiplier` varchar(10) NOT NULL DEFAULT '1.15',
	`terrainSteepMultiplier` varchar(10) NOT NULL DEFAULT '1.35',
	`accessModerateMultiplier` varchar(10) NOT NULL DEFAULT '1.10',
	`accessDifficultMultiplier` varchar(10) NOT NULL DEFAULT '1.25',
	`priceRangeSpread` varchar(10) NOT NULL DEFAULT '0.15',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_pricing_settings_id` PRIMARY KEY(`id`)
);
