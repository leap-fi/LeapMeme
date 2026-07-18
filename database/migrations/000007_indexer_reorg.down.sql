ALTER TABLE `tokens`
    DROP INDEX `idx_tokens_block_number`;

ALTER TABLE `trades`
    DROP INDEX `idx_trades_block_number`,
    DROP COLUMN `block_hash`;

ALTER TABLE `indexer_cursors`
    DROP COLUMN `last_block_hash`;

DROP TABLE IF EXISTS `indexer_blocks`;
