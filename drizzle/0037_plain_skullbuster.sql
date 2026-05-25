ALTER TABLE `business_settings` ADD `promoBannerEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `business_settings` ADD `promoBannerText` varchar(300) DEFAULT '';--> statement-breakpoint
ALTER TABLE `business_settings` ADD `promoBannerColor` varchar(20) DEFAULT 'orange';