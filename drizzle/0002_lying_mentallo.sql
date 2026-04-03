CREATE TABLE `lead_source_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobberRequestId` varchar(128) NOT NULL,
	`clientName` varchar(256),
	`source` enum('google_search','google_maps','facebook','instagram','word_of_mouth','yard_sign','truck_wrap','website','repeat_customer','angi','nextdoor','other') NOT NULL DEFAULT 'other',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lead_source_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `lead_source_tags_jobberRequestId_unique` UNIQUE(`jobberRequestId`)
);
