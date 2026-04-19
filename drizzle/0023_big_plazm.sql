CREATE TABLE `employee_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`requestedRole` enum('field_crew','office','supervisor') NOT NULL DEFAULT 'field_crew',
	`message` text,
	`status` enum('pending','approved','denied') NOT NULL DEFAULT 'pending',
	`ownerNote` text,
	`linkedUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_registrations_id` PRIMARY KEY(`id`)
);
