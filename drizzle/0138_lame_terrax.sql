ALTER TABLE `service_logs` ADD `sourceDocumentUrl` text;--> statement-breakpoint
ALTER TABLE `service_logs` ADD `sourceDocumentName` varchar(255);--> statement-breakpoint
ALTER TABLE `service_logs` ADD `importedAt` timestamp;