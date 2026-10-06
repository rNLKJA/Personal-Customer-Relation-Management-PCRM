CREATE TABLE `contact_links` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`add_since` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_links_user_contact_unique` ON `contact_links` (`user_id`,`contact_id`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`linked_user_id` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`occupation` text NOT NULL,
	`emails` text DEFAULT '[]' NOT NULL,
	`phones` text DEFAULT '[]' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` integer DEFAULT true NOT NULL,
	`custom_fields` text DEFAULT '[]' NOT NULL,
	`portrait` text,
	`add_date` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linked_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `contacts_owner_idx` ON `contacts` (`owner_id`);--> statement-breakpoint
CREATE INDEX `contacts_linked_idx` ON `contacts` (`linked_user_id`);--> statement-breakpoint
CREATE TABLE `email_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`auth_code` text NOT NULL,
	`purpose` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `email_codes_email_idx` ON `email_codes` (`email`);--> statement-breakpoint
CREATE TABLE `email_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`to_email` text NOT NULL,
	`subject` text NOT NULL,
	`kind` text NOT NULL,
	`html` text NOT NULL,
	`code` text,
	`action_path` text,
	`recipient_user_id` text,
	`triggered_by_user_id` text,
	`browser_key` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`read_at` integer,
	FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`triggered_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `email_outbox_to_idx` ON `email_outbox` (`to_email`);--> statement-breakpoint
CREATE INDEX `email_outbox_browser_idx` ON `email_outbox` (`browser_key`);--> statement-breakpoint
CREATE TABLE `fast_register_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`register_account_id` text NOT NULL,
	`fast_register_code` text NOT NULL,
	`invited_by_user_id` text,
	`contact_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`register_account_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`linked_user_id` text,
	`date_time` integer NOT NULL,
	`location` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`lat` real,
	`lng` real,
	`custom_fields` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linked_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `records_owner_idx` ON `records` (`owner_id`);--> statement-breakpoint
CREATE INDEX `records_contact_idx` ON `records` (`contact_id`);--> statement-breakpoint
CREATE INDEX `records_date_idx` ON `records` (`date_time`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`user_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`occupation` text,
	`emails` text DEFAULT '[]' NOT NULL,
	`phones` text DEFAULT '[]' NOT NULL,
	`portrait` text,
	`status_message` text,
	`status` text DEFAULT 'active' NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_user_name_unique` ON `users` (lower("user_name"));