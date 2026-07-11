package service

import (
	"strconv"

	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/dto"
)

func GetProtocolConfig() dto.ProtocolConfigResponse {
	cfg := common.GetProtocolConfig()
	resp := dto.ProtocolConfigResponse{
		GraduationTargetUsdc: formatProtocolUsd(cfg.GraduationTargetUSD),
		MinSeedUsdc:          formatProtocolUsd(cfg.MinSeedUsdc),
		MaxSeedUsdc:          formatProtocolUsd(cfg.MaxSeedUsdc),
		MinBuyUsdc:           formatProtocolUsd(cfg.MinBuyUsdc),
		MinSellUsdc:          formatProtocolUsd(cfg.MinSellUsdc),
		BuyFeeBps:            cfg.BuyFeeBps,
		SellFeeBps:           cfg.SellFeeBps,
		CreatorFeeShareBps:   cfg.CreatorFeeShareBps,
		Source:               cfg.Source,
	}
	if cfg.MaxTradeUsdc != nil {
		v := formatProtocolUsd(*cfg.MaxTradeUsdc)
		resp.MaxTradeUsdc = &v
	}
	if len(cfg.SeedPresets) > 0 {
		resp.SeedPresets = make([]string, 0, len(cfg.SeedPresets))
		for _, preset := range cfg.SeedPresets {
			resp.SeedPresets = append(resp.SeedPresets, formatProtocolUsd(preset))
		}
	}
	return resp
}

func formatProtocolUsd(v float64) string {
	if v == 0 {
		return "0"
	}
	return strconv.FormatFloat(v, 'f', -1, 64)
}
