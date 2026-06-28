CREATE TABLE `ai_visibility_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`overallScore` int NOT NULL,
	`platformScores` text NOT NULL,
	`mentionStats` text NOT NULL,
	`promptResults` text NOT NULL,
	`recommendations` text NOT NULL,
	`shareOfVoice` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_visibility_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_visibility_prompts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`prompt` text NOT NULL,
	`category` varchar(64) NOT NULL,
	`platform` varchar(32) NOT NULL,
	`response` text NOT NULL,
	`mentioned` boolean NOT NULL DEFAULT false,
	`prominence` varchar(16) NOT NULL DEFAULT 'none',
	`sentiment` varchar(16) NOT NULL DEFAULT 'neutral',
	`cited` boolean NOT NULL DEFAULT false,
	`score` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_visibility_prompts_id` PRIMARY KEY(`id`)
);
