package common

const (
	defaultChainRPCURL      = "https://rpc.hyperliquid.xyz/evm"
	defaultZapAddress       = "0x5f66E5Ec4ec9F045E10a580e7bA1147b0c650E45"
	defaultBondingAddress   = "0x3d968edbed8c953C814FE7Ad207705525189D13A"
	defaultRouterAddress    = "0xf1e943a1b78ac7F0976beC79c5F74C4B30C5646b"
	defaultUSDCAddress      = "0xb88339CB7199b77E23DB6E890353E22632Ba630f"
	defaultIndexerBatchSize = 50
)

var (
	IndexerEnabled         = false
	ChainRPCURL            = defaultChainRPCURL
	ChainID                = 999
	ZapAddress             = defaultZapAddress
	BondingAddress         = defaultBondingAddress
	RouterAddress          = defaultRouterAddress
	USDCAddress            = defaultUSDCAddress
	IndexerStartBlock      uint64
	IndexerBatchSize       uint64 = defaultIndexerBatchSize
	IndexerConfirmations   uint64 = 1
	IndexerPollIntervalSec        = 3
)

func loadChainEnv() {
	IndexerEnabled = GetEnvOrDefaultBool("INDEXER_ENABLED", IndexerEnabled)
	ChainRPCURL = GetEnvOrDefaultString("CHAIN_RPC_URL", ChainRPCURL)
	ChainID = GetEnvOrDefault("CHAIN_ID", ChainID)
	ZapAddress = GetEnvOrDefaultString("ZAP_ADDRESS", ZapAddress)
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
}
