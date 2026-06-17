CREATE TABLE `gallery_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`imageUrl` text NOT NULL,
	`imageKey` varchar(512),
	`service` enum('forestry_mulching','land_clearing','vegetation_management') NOT NULL DEFAULT 'forestry_mulching',
	`county` varchar(100),
	`acreage` varchar(100),
	`photoType` enum('before','after','in_progress','general') NOT NULL DEFAULT 'general',
	`featured` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gallery_items_id` PRIMARY KEY(`id`)
);
