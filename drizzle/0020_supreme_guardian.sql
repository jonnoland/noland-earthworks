CREATE TABLE `owner_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`relatedType` varchar(50),
	`relatedId` int,
	`dueAt` timestamp NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `owner_tasks_id` PRIMARY KEY(`id`)
);
