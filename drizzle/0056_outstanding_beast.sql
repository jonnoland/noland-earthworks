CREATE TABLE `equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`make` varchar(100),
	`model` varchar(100),
	`year` int,
	`serialNumber` varchar(100),
	`currentHours` int NOT NULL DEFAULT 0,
	`hoursUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`tags` text,
	`notes` text,
	`photoUrl` text,
	`status` enum('active','inactive','sold') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `field_diagnostics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipmentId` int,
	`symptoms` text NOT NULL,
	`errorCode` varchar(100),
	`photoUrl` text,
	`reportJson` text,
	`headline` varchar(500),
	`confidence` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `field_diagnostics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_intervals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipmentId` int NOT NULL,
	`serviceType` varchar(100) NOT NULL,
	`intervalHours` int NOT NULL,
	`lastServiceHours` int,
	`lastServiceDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_intervals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipmentId` int NOT NULL,
	`serviceType` varchar(100) NOT NULL,
	`serviceDate` timestamp NOT NULL,
	`hoursAtService` int,
	`performedBy` varchar(200),
	`notes` text,
	`cost` decimal(10,2),
	`receiptUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_logs_id` PRIMARY KEY(`id`)
);
