package kline

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/leap/backend/internal/model"
)

// Candle is an in-memory OHLCV bucket.
type Candle struct {
	TokenAddress string
	Period       string
	BeginTime    int64
	EndTime      int64
	OpenPrice    float64
	HighPrice    float64
	LowPrice     float64
	ClosePrice   float64
	Volume       float64
	QuoteVolume  float64
	TradeCount   uint32
}

func (c *Candle) ApplyTrade(trade model.Trade) error {
	price := model.ParseDecimalString(trade.Price)
	amount := model.ParseDecimalString(trade.Amount)
	quote := model.ParseDecimalString(trade.Volume)
	if price <= 0 {
		return fmt.Errorf("invalid trade price")
	}
	if c.TradeCount == 0 {
		c.OpenPrice = price
		c.HighPrice = price
		c.LowPrice = price
		c.ClosePrice = price
	} else {
		if price > c.HighPrice {
			c.HighPrice = price
		}
		if price < c.LowPrice {
			c.LowPrice = price
		}
		c.ClosePrice = price
	}
	c.Volume += amount
	c.QuoteVolume += quote
	c.TradeCount++
	return nil
}

func (c Candle) ToModel() model.Kline {
	return model.Kline{
		TokenAddress: c.TokenAddress,
		Period:       c.Period,
		BeginTime:    c.BeginTime,
		EndTime:      c.EndTime,
		OpenPrice:    formatDecimal(c.OpenPrice),
		HighPrice:    formatDecimal(c.HighPrice),
		LowPrice:     formatDecimal(c.LowPrice),
		ClosePrice:   formatDecimal(c.ClosePrice),
		Volume:       formatDecimal(c.Volume),
		QuoteVolume:  formatDecimal(c.QuoteVolume),
		TradeCount:   c.TradeCount,
	}
}

func CandleFromModel(row model.Kline) Candle {
	return Candle{
		TokenAddress: row.TokenAddress,
		Period:       row.Period,
		BeginTime:    row.BeginTime,
		EndTime:      row.EndTime,
		OpenPrice:    model.ParseDecimalString(row.OpenPrice),
		HighPrice:    model.ParseDecimalString(row.HighPrice),
		LowPrice:     model.ParseDecimalString(row.LowPrice),
		ClosePrice:   model.ParseDecimalString(row.ClosePrice),
		Volume:       model.ParseDecimalString(row.Volume),
		QuoteVolume:  model.ParseDecimalString(row.QuoteVolume),
		TradeCount:   row.TradeCount,
	}
}

func formatDecimal(v float64) string {
	if v == 0 {
		return "0"
	}
	return strconv.FormatFloat(v, 'f', -1, 64)
}

// AggregateCandles rolls up lower-period candles into a higher period.
func AggregateCandles(rows []Candle, targetPeriod string) ([]Candle, error) {
	if len(rows) == 0 {
		return []Candle{}, nil
	}
	targetSec, err := PeriodDurationSec(targetPeriod)
	if err != nil {
		return nil, err
	}

	type key struct {
		begin int64
	}
	buckets := make(map[key]*Candle)
	order := make([]key, 0)

	for _, row := range rows {
		begin := (row.BeginTime / targetSec) * targetSec
		k := key{begin: begin}
		cur, ok := buckets[k]
		if !ok {
			end, _ := BucketEndSec(begin, targetPeriod)
			cur = &Candle{
				TokenAddress: row.TokenAddress,
				Period:       targetPeriod,
				BeginTime:    begin,
				EndTime:      end,
			}
			buckets[k] = cur
			order = append(order, k)
		}
		if cur.TradeCount == 0 {
			cur.OpenPrice = row.OpenPrice
			cur.HighPrice = row.HighPrice
			cur.LowPrice = row.LowPrice
			cur.ClosePrice = row.ClosePrice
		} else {
			if row.HighPrice > cur.HighPrice {
				cur.HighPrice = row.HighPrice
			}
			if row.LowPrice < cur.LowPrice {
				cur.LowPrice = row.LowPrice
			}
			cur.ClosePrice = row.ClosePrice
		}
		cur.Volume += row.Volume
		cur.QuoteVolume += row.QuoteVolume
		cur.TradeCount += row.TradeCount
	}

	out := make([]Candle, 0, len(order))
	for _, k := range order {
		out = append(out, *buckets[k])
	}
	return out, nil
}

// BuildCandlesFromTrades aggregates ascending trades into 1m candles.
func BuildCandlesFromTrades(tokenAddress string, trades []model.Trade) ([]Candle, error) {
	tokenAddress = normalizeAddress(tokenAddress)
	if tokenAddress == "" {
		return []Candle{}, nil
	}

	type key struct {
		begin int64
	}
	buckets := make(map[key]*Candle)
	order := make([]key, 0)

	for _, trade := range trades {
		begin, err := BucketBeginSec(trade.TradeTime, Period1m)
		if err != nil {
			continue
		}
		k := key{begin: begin}
		cur, ok := buckets[k]
		if !ok {
			end, _ := BucketEndSec(begin, Period1m)
			cur = &Candle{
				TokenAddress: tokenAddress,
				Period:       Period1m,
				BeginTime:    begin,
				EndTime:      end,
			}
			buckets[k] = cur
			order = append(order, k)
		}
		_ = cur.ApplyTrade(trade)
	}

	out := make([]Candle, 0, len(order))
	for _, k := range order {
		out = append(out, *buckets[k])
	}
	return out, nil
}

func normalizeAddress(raw string) string {
	return strings.ToLower(strings.TrimSpace(raw))
}
