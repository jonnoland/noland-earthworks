ALTER TABLE `native_invoices` ADD `stripePaymentLinkUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `native_invoices` ADD `stripeCheckoutSessionId` varchar(255);--> statement-breakpoint
ALTER TABLE `native_invoices` ADD `stripePaymentIntentId` varchar(255);