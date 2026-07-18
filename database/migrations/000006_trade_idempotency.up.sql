-- Trade idempotency: UNIQUE(chain_id, hash, log_index) instead of UNIQUE(hash).
ALTER TABLE `trades`
    ADD COLUMN `chain_id` bigint NOT NULL DEFAULT 0 AFTER `id`,
    ADD COLUMN `log_index` int unsigned NOT NULL DEFAULT 0 AFTER `hash`;

-- Backfill chain_id for existing rows (HyperEVM default used by this project).
UPDATE `trades` SET `chain_id` = 999 WHERE `chain_id` = 0;

ALTER TABLE `trades`
    DROP INDEX `idx_trades_hash`,
    ADD UNIQUE KEY `idx_trades_chain_hash_log` (`chain_id`, `hash`, `log_index`),
    ADD KEY `idx_trades_hash` (`hash`);
