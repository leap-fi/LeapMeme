ALTER TABLE `tokens`
    ADD COLUMN `zap_address` varchar(42) DEFAULT NULL AFTER `router_address`;
