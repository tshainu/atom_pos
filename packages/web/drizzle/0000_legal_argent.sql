CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shop_id` integer NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'General' NOT NULL,
	`barcode` text,
	`icon_url` text,
	`commission` real DEFAULT 0,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `price_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`label` text DEFAULT 'Default' NOT NULL,
	`price` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`item_name` text NOT NULL,
	`qty` integer DEFAULT 1 NOT NULL,
	`price_per_item` real NOT NULL,
	`total` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shop_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`bill_number` text NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`net_pay` real DEFAULT 0 NOT NULL,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `shops` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shop_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shops_shop_id_unique` ON `shops` (`shop_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shop_id` integer NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`role` text DEFAULT 'cashier' NOT NULL,
	`address` text,
	`city` text,
	`phone` text,
	`bank` text,
	`branch` text,
	`account_number` text,
	`salary` real DEFAULT 0,
	`salary_period` text DEFAULT 'monthly',
	`commission` real DEFAULT 0,
	`photo_url` text,
	`created_at` integer NOT NULL
);
