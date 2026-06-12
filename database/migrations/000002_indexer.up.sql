CREATE TABLE IF NOT EXISTS `indexer_cursors` (
    `name` varchar(64) NOT NULL,
    `last_block` bigint unsigned NOT NULL DEFAULT 0,
    `updated_at` bigint DEFAULT NULL,
    PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tokens` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `address` varchar(42) NOT NULL,
    `symbol` varchar(64) NOT NULL DEFAULT '',
    `name` varchar(128) NOT NULL DEFAULT '',
    `creator` varchar(42) DEFAULT NULL,
    `lt_address` varchar(42) DEFAULT NULL,
    `tx_hash` varchar(66) DEFAULT NULL,
    `block_number` bigint unsigned DEFAULT NULL,
    `status` varchar(32) NOT NULL DEFAULT 'TRADING',
    `created_at` bigint DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_tokens_address` (`address`),
    KEY `idx_tokens_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `trades` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `hash` varchar(66) NOT NULL,
    `token_address` varchar(42) NOT NULL,
    `symbol` varchar(64) NOT NULL DEFAULT '',
    `name` varchar(128) NOT NULL DEFAULT '',
    `account` varchar(42) NOT NULL,
    `side` varchar(8) NOT NULL,
    `amount` varchar(64) NOT NULL DEFAULT '0',
    `volume` varchar(64) NOT NULL DEFAULT '0',
    `price` varchar(64) NOT NULL DEFAULT '0',
    `source` varchar(32) NOT NULL DEFAULT 'zap',
    `trade_time` bigint NOT NULL,
    `block_number` bigint unsigned DEFAULT NULL,
    `created_at` bigint DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_trades_hash` (`hash`),
    KEY `idx_trades_token_address` (`token_address`),
    KEY `idx_trades_trade_time` (`trade_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
