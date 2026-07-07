package indexer

import (
	"context"
	"strings"

	ethcommon "github.com/ethereum/go-ethereum/common"
	"github.com/leap/backend/internal/model"
)

// SyncTokenBondingCurve refreshes bonding_curve_volume/progress from on-chain raisedUsdc.
func SyncTokenBondingCurve(ctx context.Context, address string) error {
	address = strings.TrimSpace(address)
	if address == "" {
		return nil
	}

	cfg := LoadConfig()
	if !cfg.Enabled() || cfg.BondingAddress == "" {
		return nil
	}

	token, err := model.GetTokenByAddress(address)
	if err != nil || token == nil {
		return err
	}

	scanner, err := NewScanner(cfg)
	if err != nil {
		return err
	}
	defer scanner.Close()

	scanner.syncBondingCurveFromChain(ctx, token, ethcommon.HexToAddress(address))
	scanner.syncTokenGraduation(ctx, token, ethcommon.HexToAddress(address))
	scanner.refreshTokenMarketFields(ctx, token, ethcommon.HexToAddress(address))
	return model.UpsertToken(token)
}
