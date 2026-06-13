package kline

import (
	"fmt"
	"strings"
)

const (
	Period1m  = "1m"
	Period15m = "15m"
	Period1h  = "1h"
	Period1d  = "1d"
)

var AllPeriods = []string{Period1m, Period15m, Period1h, Period1d}

var periodSeconds = map[string]int64{
	Period1m:  60,
	Period15m: 15 * 60,
	Period1h:  60 * 60,
	Period1d:  24 * 60 * 60,
}

func NormalizePeriod(raw string) (string, error) {
	p := strings.TrimSpace(raw)
	if p == "" {
		return Period1m, nil
	}
	if _, ok := periodSeconds[p]; !ok {
		return "", fmt.Errorf("period does not support")
	}
	return p, nil
}

func PeriodDurationSec(period string) (int64, error) {
	p, err := NormalizePeriod(period)
	if err != nil {
		return 0, err
	}
	return periodSeconds[p], nil
}

// BucketBeginSec maps a trade timestamp (ms) to candle open time (sec).
func BucketBeginSec(tradeTimeMs int64, period string) (int64, error) {
	sec, err := PeriodDurationSec(period)
	if err != nil {
		return 0, err
	}
	if tradeTimeMs <= 0 {
		return 0, fmt.Errorf("invalid trade time")
	}
	ts := tradeTimeMs / 1000
	return (ts / sec) * sec, nil
}

func BucketEndSec(beginSec int64, period string) (int64, error) {
	sec, err := PeriodDurationSec(period)
	if err != nil {
		return 0, err
	}
	return beginSec + sec, nil
}
