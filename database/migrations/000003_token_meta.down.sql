DROP INDEX `idx_tokens_graduated_at` ON `tokens`;
DROP INDEX `idx_tokens_target_asset` ON `tokens`;
DROP INDEX `idx_tokens_status` ON `tokens`;

ALTER TABLE `tokens`
    DROP COLUMN `graduated_at`,
    DROP COLUMN `bonding_curve_progress`,
    DROP COLUMN `bonding_curve_volume`,
    DROP COLUMN `market_cap`,
    DROP COLUMN `last_price`,
    DROP COLUMN `total_supply`,
    DROP COLUMN `is_long`,
    DROP COLUMN `target_leverage`,
    DROP COLUMN `target_asset`,
    DROP COLUMN `router_address`,
    DROP COLUMN `bonding_address`,
    DROP COLUMN `website`,
    DROP COLUMN `telegram`,
    DROP COLUMN `twitter`,
    DROP COLUMN `description`,
    DROP COLUMN `logo`;
