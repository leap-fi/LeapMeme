package service

import (
	"context"
	"strconv"
	"strings"

	"github.com/leap/backend/internal/dto"
	"github.com/leap/backend/internal/indexer"
	"github.com/leap/backend/internal/model"
)

func ListNewTokens(query dto.NewTokensQuery) ([]dto.TokenNewResponse, error) {
	filter := model.TokenListFilter{
		Type:      query.Type,
		Market:    query.Market,
		Leverage:  query.Leverage,
		Direction: query.Direction,
		SortField: query.SortField,
		SortOrder: query.SortOrder,
		Page:      parsePositiveInt(query.PageNum, 1),
		PageSize:  parsePositiveInt(query.PageSize, 30),
	}

	tokens, err := model.ListTokens(filter)
	if err != nil {
		return nil, err
	}
	if len(tokens) == 0 {
		return []dto.TokenNewResponse{}, nil
	}

	addresses := make([]string, 0, len(tokens))
	for _, t := range tokens {
		addresses = append(addresses, t.Address)
	}
	stats, err := model.GetTradeVolumeStatsByTokens(addresses)
	if err != nil {
		return nil, err
	}

	out := make([]dto.TokenNewResponse, 0, len(tokens))
	for _, token := range tokens {
		out = append(out, toTokenNewResponse(token, stats[strings.ToLower(token.Address)]))
	}

	if query.SortField == "tradeVolume" || query.SortField == "priceChangePercent24h" {
		out = sortTokenResponses(out, query.SortField, query.SortOrder, stats)
	}

	return out, nil
}

func ListAccountMarkets(ctx context.Context) ([]dto.AccountMarketResponse, error) {
	cfg := indexer.LoadConfig()
	if cfg.RPCURL == "" || cfg.BondingAddress == "" {
		return []dto.AccountMarketResponse{}, nil
	}
	return indexer.LoadAccountMarkets(ctx, cfg)
}

func parsePositiveInt(raw string, fallback int) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 1 {
		return fallback
	}
	return n
}

func sortTokenResponses(
	items []dto.TokenNewResponse,
	sortField, sortOrder string,
	stats map[string]model.TokenVolumeStats,
) []dto.TokenNewResponse {
	desc := !strings.EqualFold(sortOrder, "asc")
	sorted := append([]dto.TokenNewResponse(nil), items...)

	less := func(i, j int) bool {
		var vi, vj float64
		switch sortField {
		case "tradeVolume":
			if sorted[i].TradeVolume24h != nil {
				vi = model.ParseDecimalString(*sorted[i].TradeVolume24h)
			}
			if sorted[j].TradeVolume24h != nil {
				vj = model.ParseDecimalString(*sorted[j].TradeVolume24h)
			}
		default:
			return false
		}
		if desc {
			return vi > vj
		}
		return vi < vj
	}

	for i := 0; i < len(sorted); i++ {
		for j := i + 1; j < len(sorted); j++ {
			if less(j, i) {
				sorted[i], sorted[j] = sorted[j], sorted[i]
			}
		}
	}
	return sorted
}
