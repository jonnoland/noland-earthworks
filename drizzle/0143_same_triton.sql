CREATE TABLE `native_invoice_refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`amountCents` int NOT NULL,
	`method` varchar(30) NOT NULL,
	`reference` varchar(255),
	`notes` text,
	`refundedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `native_invoice_refunds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `native_invoices` MODIFY COLUMN `status` enum('unpaid','sent','paid','refunded','void') NOT NULL DEFAULT 'unpaid';--> statement-breakpoint
ALTER TABLE `native_invoices` ADD `refundedCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `native_invoices` ADD `refundedAt` timestamp;--> statement-breakpoint
ALTER TABLE `native_invoices` ADD `refundMethod` varchar(30);--> statement-breakpoint
ALTER TABLE `native_invoices` ADD `refundReference` varchar(255);--> statement-breakpoint
ALTER TABLE `native_invoices` ADD `refundNotes` text;--> statement-breakpoint
CREATE INDEX `native_invoice_refunds_invoice_idx` ON `native_invoice_refunds` (`invoiceId`);