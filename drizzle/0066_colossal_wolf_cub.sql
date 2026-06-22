CREATE TABLE `hidden_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobberClientId` varchar(120) NOT NULL,
	`clientName` varchar(255),
	`hiddenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hidden_clients_id` PRIMARY KEY(`id`)
);
