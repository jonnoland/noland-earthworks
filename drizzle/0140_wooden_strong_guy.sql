ALTER TABLE `native_invoices` ADD `paymentMethod` varchar(30);--> statement-breakpoint
ALTER TABLE `native_invoices` ADD `paymentReference` varchar(100);--> statement-breakpoint
ALTER TABLE `native_invoices` ADD `paymentNotes` text;