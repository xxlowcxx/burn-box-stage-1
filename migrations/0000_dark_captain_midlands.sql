CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_id` integer,
	`action` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`timestamp` integer DEFAULT 1785392507 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`original_name` text NOT NULL,
	`safe_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`safe_size` integer NOT NULL,
	`scan_status` text DEFAULT 'scanning' NOT NULL,
	`scan_summary` text DEFAULT '' NOT NULL,
	`threats_detected` text,
	`safe_copy_path` text NOT NULL,
	`created_at` integer DEFAULT 1785392507 NOT NULL,
	`scanned_at` integer
);
