CREATE TABLE `owner_sms_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertType` varchar(64) NOT NULL,
	`recipient` varchar(20) NOT NULL,
	`leadName` varchar(255),
	`service` varchar(255),
	`estimatedValueCents` int,
	`message` text NOT NULL,
	`twilioSid` varchar(64),
	`status` enum('accepted','failed') NOT NULL,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `owner_sms_alerts_id` PRIMARY KEY(`id`)
);
