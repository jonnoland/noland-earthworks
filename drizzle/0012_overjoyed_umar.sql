CREATE TABLE `message_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(50) NOT NULL,
	`channel` varchar(10) NOT NULL,
	`subject` varchar(300),
	`body` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `message_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminder_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleType` varchar(20) NOT NULL,
	`offsetDays` int NOT NULL DEFAULT 1,
	`channel` varchar(10) NOT NULL DEFAULT 'sms',
	`templateId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reminder_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceType` varchar(100) NOT NULL,
	`easyAcresPerDay` decimal(5,2) NOT NULL DEFAULT '2.00',
	`normalAcresPerDay` decimal(5,2) NOT NULL DEFAULT '1.50',
	`hardAcresPerDay` decimal(5,2) NOT NULL DEFAULT '0.75',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_catalog_id` PRIMARY KEY(`id`)
);
