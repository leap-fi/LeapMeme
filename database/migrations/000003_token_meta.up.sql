ALTER TABLE `tokens`
    ADD COLUMN `logo` varchar(512) DEFAULT NULL AFTER `name`,
    ADD COLUMN `description` text DEFAULT NULL AFTER `logo`,
    ADD COLUMN `twitter` varchar(256) DEFAULT NULL AFTER `description`,
    ADD COLUMN `telegram` varchar(256) DEFAULT NULL AFTER `twitter`,
    ADD COLUMN `website` varchar(256) DEFAULT NULL AFTER `telegram`,
    ADD COLUMN `bonding_address` varchar(42) DEFAULT NULL AFTER `lt_address`,
    ADD COLUMN `router_address` varchar(42) DEFAULT NULL AFTER `bonding_address`,
    ADD COLUMN `target_asset` varchar(128) DEFAULT NULL AFTER `router_address`,
    ADD COLUMN `target_leverage` int DEFAULT NULL AFTER `target_asset`,
    ADD COLUMN `is_long` tinyint(1) DEFAULT NULL AFTER `target_leverage`,
    ADD COLUMN `total_supply` varchar(64) DEFAULT NULL AFTER `is_long`,
    ADD COLUMN `last_price` varchar(64) DEFAULT NULL AFTER `total_supply`,
    ADD COLUMN `market_cap` varchar(64) DEFAULT NULL AFTER `last_price`,
    ADD COLUMN `bonding_curve_volume` varchar(64) NOT NULL DEFAULT '0' AFTER `market_cap`,
    ADD COLUMN `bonding_curve_progress` varchar(16) NOT NULL DEFAULT '0' AFTER `bonding_curve_volume`,
    ADD COLUMN `graduated_at` bigint DEFAULT NULL AFTER `bonding_curve_progress`;

CREATE INDEX `idx_tokens_status` ON `tokens` (`status`);
CREATE INDEX `idx_tokens_target_asset` ON `tokens` (`target_asset`);
CREATE INDEX `idx_tokens_graduated_at` ON `tokens` (`graduated_at`);
