package kline

import (
	"testing"
	"time"
)

func TestFillTimeGapsClampsDistantHistoryStart(t *testing.T) {
	period := Period1m
	periodSec := int64(60)

	firstTrade := int64(1_783_435_380)
	trades := []Candle{
		{
			TokenAddress: "0xabc",
			Period:       period,
			BeginTime:    firstTrade,
			EndTime:      firstTrade + periodSec,
			OpenPrice:    1,
			HighPrice:    1,
			LowPrice:     1,
			ClosePrice:   1,
			TradeCount:   1,
		},
		{
			TokenAddress: "0xabc",
			Period:       period,
			BeginTime:    firstTrade + 3*periodSec,
			EndTime:      firstTrade + 4*periodSec,
			OpenPrice:    2,
			HighPrice:    2,
			LowPrice:     2,
			ClosePrice:   2,
			TradeCount:   1,
		},
	}

	distantStart := time.Date(2026, 5, 16, 0, 0, 0, 0, time.UTC).Unix()
	end := firstTrade + 10*periodSec

	out, err := FillTimeGaps(trades, period, distantStart, end)
	if err != nil {
		t.Fatalf("FillTimeGaps: %v", err)
	}
	if len(out) == 0 {
		t.Fatal("expected candles")
	}

	for i := 1; i < len(out); i++ {
		delta := out[i].BeginTime - out[i-1].BeginTime
		if delta != periodSec {
			t.Fatalf("gap at %d: delta=%d begin=%d prev=%d", i, delta, out[i].BeginTime, out[i-1].BeginTime)
		}
	}

	if out[0].BeginTime > firstTrade {
		t.Fatalf("first begin %d after first trade %d", out[0].BeginTime, firstTrade)
	}
	if out[len(out)-1].BeginTime < firstTrade+3*periodSec {
		t.Fatalf("missing tail bars: last=%d", out[len(out)-1].BeginTime)
	}
}
