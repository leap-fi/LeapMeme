package service

import (
	"context"
	"strconv"
	"strings"

	"github.com/leap/backend/internal/dto"
	"github.com/leap/backend/internal/indexer"
	"github.com/leap/backend/internal/model"
)

const maxTrendingScan = 500

func ListNewTokens(query dto.NewTokensQuery) ([]dto.TokenNewResponse, error) {
	return listTokenResponses(dtoToTokenFilter(query), query.SortField, query.SortOrder, false)
}

func ListTrendingTokens(query dto.TrendingTokensQuery) ([]dto.TokenNewResponse, error) {
	filter := dtoToTrendingFilter(query)
	if filter.SortField == "" {
		filter.SortField = "tradeVolume"
		filter.SortOrder = "desc"
	}
	return listTokenResponses(filter, filter.SortField, filter.SortOrder, true)
}

func listTokenResponses(
	filter model.TokenListFilter,
	sortField, sortOrder string,
	trending bool,
) ([]dto.TokenNewResponse, error) {
	page := filter.Page
	pageSize := filter.PageSize
	if trending {
		filter.Page = 1
		filter.PageSize = maxTrendingScan
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

	if sortField == "tradeVolume" || sortField == "priceChangePercent24h" || sortField == "marketCap" {
		out = sortTokenResponses(out, sortField, sortOrder, stats)
	}

	if trending {
		if page < 1 {
			page = 1
		}
		if pageSize < 1 {
			pageSize = 30
		}
		if pageSize > 100 {
			pageSize = 100
		}
		start := (page - 1) * pageSize
		if start >= len(out) {
			return []dto.TokenNewResponse{}, nil
		}
		end := start + pageSize
		if end > len(out) {
			end = len(out)
		}
		out = out[start:end]
	}

	return out, nil
}

func dtoToTokenFilter(query dto.NewTokensQuery) model.TokenListFilter {
	return model.TokenListFilter{
		Type:      query.Type,
		Market:    query.Market,
		Leverage:  query.Leverage,
		Direction: query.Direction,
		SortField: query.SortField,
		SortOrder: query.SortOrder,
		Page:      parsePositiveInt(query.PageNum, 1),
		PageSize:  parsePositiveInt(query.PageSize, 30),
	}
}

func dtoToTrendingFilter(query dto.TrendingTokensQuery) model.TokenListFilter {
	return model.TokenListFilter{
		Search:    query.Search,
		Market:    query.Market,
		Leverage:  query.Leverage,
		Direction: query.Direction,
		SortField: query.SortField,
		SortOrder: query.SortOrder,
		Page:      parsePositiveInt(query.PageNum, 1),
		PageSize:  parsePositiveInt(query.PageSize, 30),
	}
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
		case "marketCap":
			if sorted[i].MarketCap != nil {
				vi = model.ParseDecimalString(*sorted[i].MarketCap)
			}
			if sorted[j].MarketCap != nil {
				vj = model.ParseDecimalString(*sorted[j].MarketCap)
			}
		case "priceChangePercent24h":
			addrI := strings.ToLower(sorted[i].Address)
			addrJ := strings.ToLower(sorted[j].Address)
			if s, ok := stats[addrI]; ok {
				vi = s.PriceChange24h
			}
			if s, ok := stats[addrJ]; ok {
				vj = s.PriceChange24h
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
