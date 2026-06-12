package indexer

import (
	"strings"

	"github.com/leap/backend/common"
)

type Config struct {
	RPCURL           string
	ChainID          int64
	ZapAddress       string
	USDCAddress      string
	StartBlock       uint64
	BatchSize        uint64
	Confirmations    uint64
	PollIntervalSec  int
}

func LoadConfig() Config {
	return Config{
		RPCURL:          strings.TrimSpace(common.ChainRPCURL),
		ChainID:         int64(common.ChainID),
		ZapAddress:      strings.TrimSpace(common.ZapAddress),
		USDCAddress:     strings.TrimSpace(common.USDCAddress),
		StartBlock:      common.IndexerStartBlock,
		BatchSize:       common.IndexerBatchSize,
		Confirmations:   common.IndexerConfirmations,
		PollIntervalSec: common.IndexerPollIntervalSec,
	}
}

func (c Config) Enabled() bool {
	return common.IndexerEnabled && c.RPCURL != "" && c.ZapAddress != "" && c.USDCAddress != ""
}
