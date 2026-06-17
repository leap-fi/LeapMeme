CREATE TABLE IF NOT EXISTS `users` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `username` varchar(64) NOT NULL,
    `password` longtext NOT NULL,
    `display_name` varchar(64) DEFAULT NULL,
    `email` varchar(128) DEFAULT NULL,
    `role` bigint DEFAULT 1,
    `status` bigint DEFAULT 1,
    `access_token` varchar(64) DEFAULT NULL,
    `created_at` bigint DEFAULT NULL,
    `updated_at` bigint DEFAULT NULL,
    `deleted_at` datetime(3) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_users_username` (`username`),
    UNIQUE KEY `idx_users_access_token` (`access_token`),
    KEY `idx_users_email` (`email`),
    KEY `idx_users_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `options` (
    `key` varchar(191) NOT NULL,
    `value` longtext,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `setups` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `version` varchar(32) DEFAULT NULL,
    `initialized_at` bigint DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
