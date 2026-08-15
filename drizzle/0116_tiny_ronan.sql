ALTER TABLE `quote_submissions` ADD `smsConsent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_submissions` ADD `smsConsentAt` timestamp;