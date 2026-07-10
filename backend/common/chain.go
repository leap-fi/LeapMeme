package common

import "strings"

// alt.fun 生产合约（HyperEVM）— 与 api-pre / 链上存量 token 一致
const (
	defaultChainRPCURL = "https://rpc.hyperliquid.xyz/evm"

	AltFunZapAddress     = "0x693f12e9e6b35b34458793546065e8b08e0299d6"
	AltFunBondingAddress = "0xb68811BcC0e4FcD825aA49F9453b065ddF752FcB"
	AltFunRouterAddress  = "0x70c7eC6f85B960379b7ee60Af72E0f419d915878"

	defaultUSDCAddress      = "0xb88339CB7199b77E23DB6E890353E22632Ba630f"
	defaultIndexerBatchSize = 50
)

var (
	IndexerEnabled         = false
	ChainRPCURL            = defaultChainRPCURL
	ChainID                = 999
	ZapAddress             = AltFunZapAddress
	ZapAddresses           []string
	BondingAddress         = AltFunBondingAddress
	RouterAddress          = AltFunRouterAddress
	USDCAddress            = defaultUSDCAddress
	IndexerStartBlock      uint64
	IndexerBatchSize       uint64 = defaultIndexerBatchSize
	IndexerConfirmations   uint64 = 1
	IndexerPollIntervalSec        = 3

	// BondingCurveGraduationTargetUSD 必须与自有合约 LeapBonding.GRADUATION_USDC 对齐（默认 10 USDC）。
	BondingCurveGraduationTargetUSD = 10
)

func loadChainEnv() {
	IndexerEnabled = GetEnvOrDefaultBool("INDEXER_ENABLED", IndexerEnabled)
	ChainRPCURL = GetEnvOrDefaultString("CHAIN_RPC_URL", ChainRPCURL)
	ChainID = GetEnvOrDefault("CHAIN_ID", ChainID)
	ZapAddress = GetEnvOrDefaultString("ZAP_ADDRESS", ZapAddress)
	ZapAddresses = parseAddressList(GetEnvOrDefaultString("ZAP_ADDRESSES", ""))
	if len(ZapAddresses) == 0 {
		ZapAddresses = []string{AltFunZapAddress}
	}
	BondingAddress = GetEnvOrDefaultString("BONDING_ADDRESS", BondingAddress)
	RouterAddress = GetEnvOrDefaultString("ROUTER_ADDRESS", RouterAddress)
	USDCAddress = GetEnvOrDefaultString("USDC_ADDRESS", USDCAddress)

	if v := GetEnvOrDefaultUint64("INDEXER_START_BLOCK", 0); v > 0 {
		IndexerStartBlock = v
	}
	if v := GetEnvOrDefaultUint64("INDEXER_BATCH_SIZE", IndexerBatchSize); v > 0 {
		IndexerBatchSize = v
	}
	if v := GetEnvOrDefaultUint64("INDEXER_CONFIRMATIONS", IndexerConfirmations); v > 0 {
		IndexerConfirmations = v
	}
	IndexerPollIntervalSec = GetEnvOrDefault("INDEXER_POLL_INTERVAL_SEC", IndexerPollIntervalSec)
	if v := GetEnvOrDefault("BONDING_CURVE_GRADUATION_TARGET_USD", BondingCurveGraduationTargetUSD); v > 0 {
		BondingCurveGraduationTargetUSD = v
	}
}

func parseAddressList(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	seen := make(map[string]struct{})
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		key := strings.ToLower(part)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, part)
	}
	return out
}

// RouterForZap returns the alt.fun Router paired with a Zap deployment.
func RouterForZap(zap string) string {
	if strings.EqualFold(strings.TrimSpace(zap), AltFunZapAddress) {
		return AltFunRouterAddress
	}
	if RouterAddress != "" {
		return RouterAddress
	}
	return AltFunRouterAddress
}
