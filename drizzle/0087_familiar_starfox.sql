CREATE TABLE `outreach_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`instructions` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `outreach_templates_id` PRIMARY KEY(`id`)
);
