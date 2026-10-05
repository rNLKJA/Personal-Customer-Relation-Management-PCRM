CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`detail` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_log_user_idx` ON `activity_log` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `ai_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`feature` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`served_model` text,
	`prompt_version` text NOT NULL,
	`record_id` text,
	`input` text NOT NULL,
	`redaction_counts` text NOT NULL,
	`output` text,
	`error` text,
	`latency_ms` integer NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`decision` text NOT NULL,
	`final_output` text,
	`decided_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_audit_log_user_idx` ON `ai_audit_log` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `records` ADD `ai_summary` text;