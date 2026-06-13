CREATE TABLE IF NOT EXISTS `klines` (
    `token_address` varchar(42) NOT NULL,
    `period` varchar(8) NOT NULL,
    `begin_time` bigint NOT NULL,
    `end_time` bigint NOT NULL,
    `open_price` decimal(36,18) NOT NULL,
    `high_price` decimal(36,18) NOT NULL,
    `low_price` decimal(36,18) NOT NULL,
    `close_price` decimal(36,18) NOT NULL,
    `volume` decimal(36,18) NOT NULL DEFAULT 0,
    `quote_volume` decimal(36,18) NOT NULL DEFAULT 0,
    `trade_count` int unsigned NOT NULL DEFAULT 0,
    `updated_at` bigint DEFAULT NULL,
    PRIMARY KEY (`token_address`, `period`, `begin_time`),
    KEY `idx_klines_token_period_time` (`token_address`, `period`, `begin_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
