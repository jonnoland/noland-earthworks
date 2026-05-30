CREATE TABLE `x_oauth_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`expiresAt` timestamp,
	`scope` varchar(500),
	`screenName` varchar(100),
	`xUserId` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `x_oauth_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `social_posts` ADD `xPostId` varchar(200);