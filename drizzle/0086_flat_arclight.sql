ALTER TABLE `prospecting_leads` ADD `urgencyFlag` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `prospecting_leads` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `prospecting_leads` ADD `lastContactedAt` timestamp;