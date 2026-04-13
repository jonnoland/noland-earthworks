CREATE TABLE `crew_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crewId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(100) DEFAULT 'Operator',
	`clockedIn` boolean NOT NULL DEFAULT false,
	`clockedInAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crew_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`equipmentType` varchar(100) NOT NULL DEFAULT 'Mulcher',
	`dayRate` int NOT NULL DEFAULT 0,
	`costPerDay` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `crew_members` ADD CONSTRAINT `crew_members_crewId_crews_id_fk` FOREIGN KEY (`crewId`) REFERENCES `crews`(`id`) ON DELETE cascade ON UPDATE no action;