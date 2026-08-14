ALTER TABLE `quote_submissions` ADD `aiRangeConfidence` varchar(16);--> statement-breakpoint
ALTER TABLE `quote_submissions` ADD `aiRangeConfidenceScore` int;--> statement-breakpoint
ALTER TABLE `quote_submissions` ADD `aiRangeConfidenceReason` text;--> statement-breakpoint
ALTER TABLE `quote_submissions` ADD `aiRangeRiskFactors` text;