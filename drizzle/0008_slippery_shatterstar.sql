ALTER TABLE `crews` ADD `hoursPerDay` int DEFAULT 9 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `crewMemberCount` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `memberWageCents` int DEFAULT 5000 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `burdenPct` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `equipmentItems` text DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `machineBurnRateGph` int DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `fuelPriceCents` int DEFAULT 499 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `truckFuelPerDayCents` int DEFAULT 5000 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `teethCostPerSetCents` int DEFAULT 220000 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `daysPerSet` int DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `annualMajorWearCents` int DEFAULT 2640000 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `miscConsumablesPerDayCents` int DEFAULT 10000 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `overheadItems` text DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `workingDaysPerMonth` int DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `targetMarginPct` int DEFAULT 35 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `acresPerDay` int DEFAULT 1 NOT NULL;