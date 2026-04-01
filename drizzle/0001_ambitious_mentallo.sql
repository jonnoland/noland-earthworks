CREATE TABLE `jobber_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobber_tokens_id` PRIMARY KEY(`id`)
);
