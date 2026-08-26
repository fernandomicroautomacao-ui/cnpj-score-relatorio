CREATE TABLE `sales_hubs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`city` varchar(80) NOT NULL,
	`state` varchar(2) NOT NULL,
	`ddd` varchar(2),
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`isDefault` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_hubs_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_hubs_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `scoring_parameters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(64) NOT NULL,
	`label` varchar(120) NOT NULL,
	`value` int NOT NULL,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scoring_parameters_id` PRIMARY KEY(`id`),
	CONSTRAINT `scoring_parameters_key_unique` UNIQUE(`key`)
);
