CREATE TABLE `linkedin_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessToken` text NOT NULL,
	`authorUrn` varchar(200) NOT NULL,
	`displayName` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `linkedin_credentials_id` PRIMARY KEY(`id`)
);
