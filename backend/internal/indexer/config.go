package indexer

import (
	"strings"

	"github.com/leap/backend/common"
)

type Config struct {
	RPCURL          string
	ChainID         int64
	ZapAddresses    []string
	BondingAddress  string
	RouterAddress   string
	USDCAddress     string
	StartBlock      uint64
	BatchSize       uint64
	Confirmations   uint64
	ReorgLookback   uint64
	PollIntervalSec int
}

func LoadConfig() Config {
	return Config{
		RPCURL:          strings.TrimSpace(common.ChainRPCURL),
		ChainID:         int64(common.ChainID),
		ZapAddresses:    append([]string(nil), common.ZapAddresses...),
		BondingAddress:  strings.TrimSpace(common.BondingAddress),
		RouterAddress:   strings.TrimSpace(common.RouterAddress),
		USDCAddress:     strings.TrimSpace(common.USDCAddress),
		StartBlock:      common.IndexerStartBlock,
		BatchSize:       common.IndexerBatchSize,
		Confirmations:   common.IndexerConfirmations,
		ReorgLookback:   common.IndexerReorgLookback,
		PollIntervalSec: common.IndexerPollIntervalSec,
	}
}

func (c Config) Enabled() bool {
	return common.IndexerEnabled && c.RPCURL != "" && len(c.ZapAddresses) > 0 && c.USDCAddress != ""
}
