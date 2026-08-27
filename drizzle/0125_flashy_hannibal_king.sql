ALTER TABLE `business_settings` MODIFY COLUMN `email` varchar(200) DEFAULT 'quotes@nolandearthworks.com';--> statement-breakpoint
ALTER TABLE `business_settings` ADD `pricingConfig` text;--> statement-breakpoint
ALTER TABLE `business_settings` ADD `pricingConfigUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `native_jobs` ADD `legacyJobId` int;--> statement-breakpoint
ALTER TABLE `native_jobs` ADD CONSTRAINT `native_jobs_legacyJobId_unique` UNIQUE(`legacyJobId`);