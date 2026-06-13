package service

import (
	"context"
	"strings"

	"github.com/leap/backend/internal/dto"
	"github.com/leap/backend/internal/kline"
	"github.com/leap/backend/pkg/apperror"
)

func ListKlines(query dto.KlineListQuery) ([]dto.KlineResponse, error) {
	engine := kline.Default()
	if engine == nil {
		return nil, apperror.New(500, 0, "kline engine unavailable")
	}
	if _, err := kline.NormalizePeriod(query.Period); err != nil {
		return nil, apperror.Validation("period does not support")
	}
	address := strings.TrimSpace(query.Address)
	if address == "" {
		return nil, apperror.Validation("address is required")
	}
	if query.StartTime <= 0 || query.EndTime <= 0 || query.EndTime < query.StartTime {
		return nil, apperror.Validation("invalid time range")
	}

	candles, err := engine.List(address, query.Period, query.StartTime, query.EndTime)
	if err != nil {
		return nil, err
	}

	out := make([]dto.KlineResponse, 0, len(candles))
	for _, c := range candles {
		out = append(out, dto.KlineResponse{
			BeginTime:   c.BeginTime,
			EndTime:     c.EndTime,
			OpenPrice:   c.OpenPrice,
			HighPrice:   c.HighPrice,
			LowPrice:    c.LowPrice,
			ClosePrice:  c.ClosePrice,
			Volume:      c.Volume,
			QuoteVolume: c.QuoteVolume,
			Count:       int64(c.TradeCount),
		})
	}
	return out, nil
}

func BackfillKlines(ctx context.Context, query dto.KlineBackfillQuery) (kline.BackfillResult, error) {
	engine := kline.Default()
	if engine == nil {
		return kline.BackfillResult{}, apperror.New(500, 0, "kline engine unavailable")
	}

	var addresses []string
	if raw := strings.TrimSpace(query.Address); raw != "" {
		for _, part := range strings.Split(raw, ",") {
			part = strings.TrimSpace(part)
			if part != "" {
				addresses = append(addresses, part)
			}
		}
	}

	return engine.Backfill(ctx, kline.BackfillOptions{
		Addresses:   addresses,
		Replace:     query.Replace,
		BatchTrades: query.BatchTrades,
	})
}
