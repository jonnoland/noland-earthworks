CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`client` varchar(255) NOT NULL,
	`address` varchar(500),
	`jobType` enum('land_clearing','forestry_mulching','brush_removal','stump_grinding','wildfire_mitigation') NOT NULL DEFAULT 'land_clearing',
	`status` enum('estimate','scheduled','in_progress','completed','invoiced','paid') NOT NULL DEFAULT 'estimate',
	`acres` decimal(8,2),
	`crewDays` decimal(8,2),
	`totalPrice` decimal(10,2),
	`notes` text,
	`scheduledDate` timestamp,
	`completedDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ops_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`address` varchar(500),
	`source` enum('google','facebook','referral','website','direct','other') NOT NULL DEFAULT 'other',
	`stage` enum('new','contacted','estimate_sent','negotiating','won','lost') NOT NULL DEFAULT 'new',
	`jobType` varchar(100),
	`estimatedValue` decimal(10,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ops_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobId` int,
	`title` varchar(255) NOT NULL,
	`crewName` varchar(100) NOT NULL,
	`date` timestamp NOT NULL,
	`startHour` int NOT NULL DEFAULT 7,
	`endHour` int NOT NULL DEFAULT 17,
	`color` varchar(20) DEFAULT 'orange',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_entries_id` PRIMARY KEY(`id`)
);
