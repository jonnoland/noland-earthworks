CREATE TABLE `lead_contact_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`method` enum('email','sms','phone','in_person') NOT NULL,
	`subject` varchar(500),
	`body` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_contact_log_id` PRIMARY KEY(`id`)
);
