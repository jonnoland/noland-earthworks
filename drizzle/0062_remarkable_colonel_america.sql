CREATE TABLE `gallery_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`url` text NOT NULL,
	`s3Key` varchar(500) NOT NULL,
	`title` varchar(200) NOT NULL DEFAULT '',
	`description` text,
	`serviceType` varchar(100) NOT NULL DEFAULT 'forestry-mulching',
	`county` varchar(100) NOT NULL DEFAULT 'Middle Tennessee',
	`acreage` varchar(50),
	`photoType` enum('before','after','general') NOT NULL DEFAULT 'general',
	`jobId` int,
	`visible` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gallery_photos_id` PRIMARY KEY(`id`)
);
