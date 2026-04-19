CREATE TABLE `pricing_benchmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceType` varchar(100) NOT NULL,
	`lowPerAcre` int NOT NULL DEFAULT 0,
	`midPerAcre` int NOT NULL DEFAULT 0,
	`highPerAcre` int NOT NULL DEFAULT 0,
	`region` varchar(200) NOT NULL DEFAULT 'Middle & West Tennessee',
	`researchSummary` text,
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pricing_benchmarks_id` PRIMARY KEY(`id`),
	CONSTRAINT `pricing_benchmarks_serviceType_unique` UNIQUE(`serviceType`)
);
