CREATE TABLE `pricing_benchmark_candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceType` varchar(100) NOT NULL,
	`lowAmount` int NOT NULL,
	`midAmount` int NOT NULL,
	`highAmount` int NOT NULL,
	`unit` enum('acre','linear_foot','hour','load','stump','flat') NOT NULL,
	`region` varchar(200) NOT NULL DEFAULT 'Middle & West Tennessee',
	`researchSummary` text NOT NULL,
	`sourceUrls` text,
	`status` enum('pending_review','approved','rejected') NOT NULL DEFAULT 'pending_review',
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricing_benchmark_candidates_id` PRIMARY KEY(`id`),
	CONSTRAINT `pricing_benchmark_candidates_serviceType_unique` UNIQUE(`serviceType`)
);
--> statement-breakpoint
ALTER TABLE `pricing_benchmarks` ADD `unit` enum('acre','linear_foot','hour','load','stump','flat') DEFAULT 'acre' NOT NULL;--> statement-breakpoint
ALTER TABLE `pricing_benchmarks` ADD `sourceUrls` text;--> statement-breakpoint
ALTER TABLE `pricing_benchmarks` ADD `evidenceStatus` enum('legacy_unverified','owner_approved') DEFAULT 'legacy_unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE `pricing_benchmarks` ADD `reviewedAt` timestamp;