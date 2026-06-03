CREATE TABLE `copy_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteUrl` varchar(300) NOT NULL DEFAULT 'nolandearthworks.com',
	`fbHashtags` varchar(500) NOT NULL DEFAULT '#NolandEarthworks #LandClearing #ForestryMulching #Tennessee',
	`igHashtags` varchar(500) NOT NULL DEFAULT '#NolandEarthworks #LandClearing #ForestryMulching #Tennessee #LandManagement #VeteranOwned #MiddleTennessee',
	`xHashtags` varchar(500) NOT NULL DEFAULT '#LandClearing #ForestryMulching #Tennessee',
	`liHashtags` varchar(500) NOT NULL DEFAULT '#NolandEarthworks #LandClearing #ForestryMulching #Tennessee #VeteranOwned',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `copy_settings_id` PRIMARY KEY(`id`)
);
