CREATE TABLE `seo_fixes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`checkId` varchar(100) NOT NULL,
	`category` varchar(50) NOT NULL,
	`label` varchar(300) NOT NULL,
	`checkStatus` varchar(10) NOT NULL,
	`priority` varchar(10) NOT NULL,
	`aiInstructions` text NOT NULL,
	`status` enum('pending','in_progress','resolved','skipped') NOT NULL DEFAULT 'pending',
	`note` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_fixes_id` PRIMARY KEY(`id`)
);
