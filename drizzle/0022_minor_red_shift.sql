ALTER TABLE `jobs` ADD `rescheduledAt` timestamp;--> statement-breakpoint
ALTER TABLE `jobs` ADD `isHighPriority` boolean DEFAULT false NOT NULL;