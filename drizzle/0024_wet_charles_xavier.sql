CREATE TABLE `job_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` varchar(120) NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_notes_id` PRIMARY KEY(`id`)
);
