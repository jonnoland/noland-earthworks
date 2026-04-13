CREATE TABLE `lead_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('note','call','text','email','stage_change','system') NOT NULL DEFAULT 'note',
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_notes_id` PRIMARY KEY(`id`)
);
