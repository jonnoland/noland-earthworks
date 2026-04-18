CREATE TABLE `agent_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` varchar(80) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`config` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_config_agentId_unique` UNIQUE(`agentId`)
);
--> statement-breakpoint
CREATE TABLE `agent_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` varchar(80) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'success',
	`summary` text,
	`actionsCount` int NOT NULL DEFAULT 0,
	`error` text,
	`ranAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_log_id` PRIMARY KEY(`id`)
);
