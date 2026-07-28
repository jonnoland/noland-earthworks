ALTER TABLE `distance_quotes` ADD `portalToken` varchar(64);--> statement-breakpoint
ALTER TABLE `distance_quotes` ADD `clientAction` enum('approved','declined');--> statement-breakpoint
ALTER TABLE `distance_quotes` ADD `clientActionAt` timestamp;--> statement-breakpoint
ALTER TABLE `distance_quotes` ADD `depositPaidCents` int;--> statement-breakpoint
ALTER TABLE `distance_quotes` ADD `depositPaidAt` timestamp;--> statement-breakpoint
ALTER TABLE `distance_quotes` ADD `depositSessionId` varchar(120);--> statement-breakpoint
ALTER TABLE `distance_quotes` ADD `portalViewedAt` timestamp;