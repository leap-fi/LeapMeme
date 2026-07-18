-- Reorg support: persist scanned block hashes and trade block_hash for rewind.
CREATE TABLE IF NOT EXISTS `indexer_blocks` (
    `chain_id` bigint NOT NULL,
    `block_number` bigint unsigned NOT NULL,
    `block_hash` varchar(66) NOT NULL,
    `parent_hash` varchar(66) NOT NULL DEFAULT '',
    `created_at` bigint DEFAULT NULL,
    PRIMARY KEY (`chain_id`, `block_number`),
    KEY `idx_indexer_blocks_hash` (`block_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `indexer_cursors`
    ADD COLUMN `last_block_hash` varchar(66) NOT NULL DEFAULT '' AFTER `last_block`;

ALTER TABLE `trades`
    ADD COLUMN `block_hash` varchar(66) NOT NULL DEFAULT '' AFTER `block_number`,
    ADD KEY `idx_trades_block_number` (`block_number`);

ALTER TABLE `tokens`
    ADD KEY `idx_tokens_block_number` (`block_number`);
