ALTER TABLE `trades`
    DROP INDEX `idx_trades_chain_hash_log`,
    DROP INDEX `idx_trades_hash`,
    ADD UNIQUE KEY `idx_trades_hash` (`hash`);

ALTER TABLE `trades`
    DROP COLUMN `log_index`,
    DROP COLUMN `chain_id`;
