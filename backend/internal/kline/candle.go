package kline

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

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

// ApplyPriceContinuity adjusts sparse candles for chart display: each bar opens at
// the previous bar's close. Actual trade close is preserved; high/low expand if needed.
func ApplyPriceContinuity(candles []Candle) []Candle {
	if len(candles) <= 1 {
		return candles
	}
	out := make([]Candle, len(candles))
	copy(out, candles)
	for i := 1; i < len(out); i++ {
		prevClose := out[i-1].ClosePrice
		if prevClose <= 0 {
			continue
		}
		out[i].OpenPrice = prevClose
		if out[i].HighPrice < prevClose {
			out[i].HighPrice = prevClose
		}
		if out[i].LowPrice > prevClose {
			out[i].LowPrice = prevClose
		}
	}
	return out
}

const maxGapFillBuckets = 50000

// FillTimeGaps inserts synthetic flat candles (volume=0) for missing periods so the
// time axis is continuous. Raw trade candles are unchanged; gaps use previous close.
func FillTimeGaps(candles []Candle, period string, startSec, endSec int64) ([]Candle, error) {
	if len(candles) == 0 {
		return candles, nil
	}
	periodSec, err := PeriodDurationSec(period)
	if err != nil {
		return nil, err
	}

	sorted := append([]Candle(nil), candles...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].BeginTime < sorted[j].BeginTime })

	rangeStart := int64(0)
	if startSec > 0 {
		rangeStart, err = BucketBeginSec(startSec*1000, period)
		if err != nil {
			return nil, err
		}
	}
	rangeEnd := endSec
	if rangeEnd <= 0 {
		rangeEnd = time.Now().Unix()
	}
	rangeEnd, err = BucketBeginSec(rangeEnd*1000, period)
	if err != nil {
		return nil, err
	}

	out := make([]Candle, 0, len(sorted)*2)
	bucketsAdded := 0

	synthetic := func(begin int64, price float64, sample Candle) Candle {
		end, _ := BucketEndSec(begin, period)
		return Candle{
			TokenAddress: sample.TokenAddress,
			Period:       period,
			BeginTime:    begin,
			EndTime:      end,
			OpenPrice:    price,
			HighPrice:    price,
			LowPrice:     price,
			ClosePrice:   price,
		}
	}

	appendSynthetic := func(begin int64, price float64, sample Candle) bool {
		if bucketsAdded >= maxGapFillBuckets {
			return false
		}
		out = append(out, synthetic(begin, price, sample))
		bucketsAdded++
		return true
	}

	first := sorted[0]
	if rangeStart > 0 && first.BeginTime > rangeStart {
		price := first.OpenPrice
		for t := rangeStart; t < first.BeginTime; t += periodSec {
			if !appendSynthetic(t, price, first) {
				break
			}
		}
	}

	out = append(out, first)
	prevClose := first.ClosePrice
	for i := 1; i < len(sorted); i++ {
		cur := sorted[i]
		for t := sorted[i-1].BeginTime + periodSec; t < cur.BeginTime; t += periodSec {
			if !appendSynthetic(t, prevClose, cur) {
				break
			}
		}
		out = append(out, cur)
		prevClose = cur.ClosePrice
	}

	last := sorted[len(sorted)-1]
	if last.BeginTime < rangeEnd {
		for t := last.BeginTime + periodSec; t <= rangeEnd; t += periodSec {
			if !appendSynthetic(t, prevClose, last) {
				break
			}
		}
	}

	return out, nil
}

// PrepareChartCandles fills time gaps then aligns opens for chart/API display.
// Stored klines in DB remain raw trade aggregates.
func PrepareChartCandles(candles []Candle, period string, startSec, endSec int64) ([]Candle, error) {
	filled, err := FillTimeGaps(candles, period, startSec, endSec)
	if err != nil {
		return nil, err
	}
	return ApplyPriceContinuity(filled), nil
}

// IsSyntheticGap returns true for display-only flat candles (no trades).
func (c Candle) IsSyntheticGap() bool {
	return c.TradeCount == 0 && c.Volume == 0 && c.OpenPrice > 0
}

// PreparePushSeries builds WS push payloads: optional gap-fill flats + display candle.
func PreparePushSeries(address, period string, raw Candle, prevClose float64, prevBegin int64, hasPrev bool) ([]Candle, error) {
	periodSec, err := PeriodDurationSec(period)
	if err != nil {
		return nil, err
	}

	out := make([]Candle, 0, 8)
	if hasPrev && prevBegin > 0 {
		for t := prevBegin + periodSec; t < raw.BeginTime; t += periodSec {
			out = append(out, syntheticGapCandle(address, period, t, prevClose))
		}
	}

	display := raw
	if hasPrev && prevClose > 0 {
		display.OpenPrice = prevClose
		if display.HighPrice < prevClose {
			display.HighPrice = prevClose
		}
		if display.LowPrice > prevClose {
			display.LowPrice = prevClose
		}
	}
	out = append(out, display)
	return out, nil
}

func syntheticGapCandle(address, period string, begin int64, price float64) Candle {
	end, _ := BucketEndSec(begin, period)
	return Candle{
		TokenAddress: address,
		Period:       period,
		BeginTime:    begin,
		EndTime:      end,
		OpenPrice:    price,
		HighPrice:    price,
		LowPrice:     price,
		ClosePrice:   price,
	}
}

// PreviousPeriodClose returns the close and begin of the last bucket before beforeBegin.
func PreviousPeriodClose(address, period string, beforeBegin int64) (close float64, lastBegin int64, ok bool) {
	address = normalizeAddress(address)
	if address == "" || beforeBegin <= 0 {
		return 0, 0, false
	}

	rows, err := model.ListKlines(address, Period1m, 0, beforeBegin-1)
	if err != nil || len(rows) == 0 {
		return 0, 0, false
	}

	if period == Period1m {
		last := rows[len(rows)-1]
		return model.ParseDecimalString(last.ClosePrice), last.BeginTime, true
	}

	tmp := make([]Candle, 0, len(rows))
	for _, row := range rows {
		tmp = append(tmp, CandleFromModel(row))
	}
	agg, err := AggregateCandles(tmp, period)
	if err != nil || len(agg) == 0 {
		return 0, 0, false
	}
	for i := len(agg) - 1; i >= 0; i-- {
		if agg[i].BeginTime < beforeBegin {
			return agg[i].ClosePrice, agg[i].BeginTime, true
		}
	}
	return 0, 0, false
}

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
