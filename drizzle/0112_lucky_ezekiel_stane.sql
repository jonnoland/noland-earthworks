ALTER TABLE `quote_submissions` ADD COLUMN IF NOT EXISTS `serviceBreakdown` text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `lead_generation_tracking_settings_task_uid_idx` ON `lead_generation_tracking_settings` (`schedule_cron_task_uid`);
