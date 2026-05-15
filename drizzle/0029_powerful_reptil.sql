CREATE TABLE `google_oauth_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`expiresAt` timestamp NOT NULL,
	`scope` varchar(500),
	`locationName` varchar(255),
	`businessName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `google_oauth_tokens_id` PRIMARY KEY(`id`)
);
