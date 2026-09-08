CREATE TABLE `native_job_schedule_dates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`scheduledDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `native_job_schedule_dates_id` PRIMARY KEY(`id`),
	CONSTRAINT `native_job_schedule_dates_job_date_unique` UNIQUE(`jobId`,`scheduledDate`)
);
--> statement-breakpoint
CREATE INDEX `native_job_schedule_dates_date_idx` ON `native_job_schedule_dates` (`scheduledDate`);