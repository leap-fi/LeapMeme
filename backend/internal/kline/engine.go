package kline

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/model"
)

const (
	openFlushInterval = 3 * time.Second
	openEvictInterval = 5 * time.Minute
	openIdleTTL       = 2 * time.Hour
)

// Engine consumes trades, maintains 1m open candles, persists closed bars, and broadcasts.
type Engine struct {
	hub *Hub

	mu        sync.Mutex
	open      map[string]*Candle // token address -> current 1m open candle
	lastTrade map[string]int64   // token address -> last trade time (ms)
	dirty     map[string]bool
	trade     chan *model.Trade
	stop      chan struct{}
}

func NewEngine(hub *Hub) *Engine {
	e := &Engine{
		hub:       hub,
		open:      make(map[string]*Candle),
		lastTrade: make(map[string]int64),
		dirty:     make(map[string]bool),
		trade:     make(chan *model.Trade, 4096),
		stop:      make(chan struct{}),
	}
	hub.SetLastUnsubHook(e.evictAddress)
	go e.worker()
	go e.maintenanceLoop()
	return e
}

func (e *Engine) worker() {
	for {
		select {
		case trade := <-e.trade:
			if trade == nil {
				continue
			}
			if err := e.applyTrade(trade); err != nil {
				common.SysError(fmt.Sprintf("kline apply trade %s: %v", trade.Hash, err))
			}
		case <-e.stop:
			return
		}
	}
}

func (e *Engine) maintenanceLoop() {
	flushTicker := time.NewTicker(openFlushInterval)
	evictTicker := time.NewTicker(openEvictInterval)
	defer flushTicker.Stop()
	defer evictTicker.Stop()

	for {
		select {
		case <-flushTicker.C:
			e.flushDirtyOpen()
			e.sealExpiredOpen()
		case <-evictTicker.C:
			e.evictIdleOpen()
		case <-e.stop:
			return
		}
	}
}

// OnTrade enqueues a trade for async kline updates.
func (e *Engine) OnTrade(trade *model.Trade) {
	if e == nil || trade == nil {
		return
	}
	select {
	case e.trade <- trade:
	default:
		common.SysError("kline trade channel full, dropping trade " + trade.Hash)
	}
}

func (e *Engine) broadcastPrepared(address, period string, raw Candle) {
	prevClose, prevBegin, hasPrev := PreviousPeriodClose(address, period, raw.BeginTime)
	series, err := PreparePushSeries(address, period, raw, prevClose, prevBegin, hasPrev)
	if err != nil {
		common.SysError("kline prepare push: " + err.Error())
		return
	}
	for _, c := range series {
		e.hub.Broadcast(c)
	}
}

func (e *Engine) applyTrade(trade *model.Trade) error {
	address := normalizeAddress(trade.TokenAddress)
	if address == "" {
		return fmt.Errorf("empty token address")
	}

	var closed *Candle
	var open1m Candle
	hasOpen := false

	e.mu.Lock()
	e.lastTrade[address] = trade.TradeTime

	begin, err := BucketBeginSec(trade.TradeTime, Period1m)
	if err != nil {
		e.mu.Unlock()
		return err
	}

	cur := e.open[address]
	if cur != nil && cur.BeginTime != begin {
		c := *cur
		closed = &c
		cur = nil
	}
	if cur == nil {
		end, _ := BucketEndSec(begin, Period1m)
		cur = &Candle{
			TokenAddress: address,
			Period:       Period1m,
			BeginTime:    begin,
			EndTime:      end,
		}
		if row, ok, err := model.GetKline(address, Period1m, begin); err != nil {
			e.mu.Unlock()
			return err
		} else if ok && row.TradeCount > 0 {
			loaded := CandleFromModel(row)
			cur = &loaded
		}
		e.open[address] = cur
	}
	if err := cur.ApplyTrade(*trade); err != nil {
		e.mu.Unlock()
		return err
	}
	open1m = *cur
	hasOpen = cur.TradeCount > 0
	e.dirty[address] = true
	e.mu.Unlock()

	if closed != nil && closed.TradeCount > 0 {
		if err := model.UpsertKlines([]model.Kline{closed.ToModel()}); err != nil {
			return err
		}
	}

	if hasOpen {
		for _, period := range e.hub.SubscribedPeriods(address) {
			if candle, ok := e.buildOpenCandle(address, period, &open1m); ok {
				e.broadcastPrepared(address, period, candle)
			}
		}
	}
	return nil
}

// buildOpenCandle returns the current open candle for a period.
// open1m may be nil; when non-nil it avoids re-reading the in-memory 1m copy.
func (e *Engine) buildOpenCandle(address, period string, open1m *Candle) (Candle, bool) {
	address = normalizeAddress(address)
	period, err := NormalizePeriod(period)
	if err != nil {
		return Candle{}, false
	}

	if open1m == nil {
		e.mu.Lock()
		if cur := e.open[address]; cur != nil && cur.TradeCount > 0 {
			c := *cur
			open1m = &c
		}
		e.mu.Unlock()
	}

	if period == Period1m {
		if open1m == nil {
			return Candle{}, false
		}
		return *open1m, true
	}

	refSec := time.Now().Unix()
	if open1m != nil {
		refSec = open1m.BeginTime
	}
	bucketBegin, err := BucketBeginSec(refSec*1000, period)
	if err != nil {
		return Candle{}, false
	}

	rows, err := model.ListKlines(address, Period1m, bucketBegin, 0)
	if err != nil {
		return Candle{}, false
	}
	tmp := make([]Candle, 0, len(rows)+1)
	for _, row := range rows {
		tmp = append(tmp, CandleFromModel(row))
	}
	if open1m != nil && open1m.BeginTime >= bucketBegin {
		merged := false
		for i := range tmp {
			if tmp[i].BeginTime == open1m.BeginTime {
				tmp[i] = *open1m
				merged = true
				break
			}
		}
		if !merged {
			tmp = append(tmp, *open1m)
		}
	}
	if len(tmp) == 0 {
		return Candle{}, false
	}
	agg, err := AggregateCandles(tmp, period)
	if err != nil || len(agg) == 0 {
		return Candle{}, false
	}
	for i := len(agg) - 1; i >= 0; i-- {
		if agg[i].BeginTime == bucketBegin && agg[i].TradeCount > 0 {
			return agg[i], true
		}
	}
	return Candle{}, false
}

func (e *Engine) flushDirtyOpen() {
	e.mu.Lock()
	rows := make([]model.Kline, 0)
	for address, cur := range e.open {
		if !e.dirty[address] || cur == nil || cur.TradeCount == 0 {
			continue
		}
		rows = append(rows, cur.ToModel())
	}
	for address := range e.dirty {
		delete(e.dirty, address)
	}
	e.mu.Unlock()
	if err := model.UpsertKlines(rows); err != nil {
		common.SysError("kline flush open: " + err.Error())
	}
}

func (e *Engine) sealExpiredOpen() {
	now := time.Now().Unix()
	e.mu.Lock()
	closed := make([]model.Kline, 0)
	for address, cur := range e.open {
		if cur == nil || cur.TradeCount == 0 || now < cur.EndTime {
			continue
		}
		closed = append(closed, cur.ToModel())
		delete(e.open, address)
		delete(e.dirty, address)
	}
	e.mu.Unlock()
	if err := model.UpsertKlines(closed); err != nil {
		common.SysError("kline seal expired: " + err.Error())
	}
}

func (e *Engine) evictIdleOpen() {
	nowMs := time.Now().UnixMilli()
	cutoff := nowMs - openIdleTTL.Milliseconds()

	e.mu.Lock()
	var evicted []model.Kline
	for address, cur := range e.open {
		if e.hub.HasAnySubscriber(address) {
			continue
		}
		last, ok := e.lastTrade[address]
		if !ok || last >= cutoff {
			continue
		}
		if cur != nil && cur.TradeCount > 0 {
			evicted = append(evicted, cur.ToModel())
		}
		delete(e.open, address)
		delete(e.dirty, address)
		delete(e.lastTrade, address)
	}
	e.mu.Unlock()

	if err := model.UpsertKlines(evicted); err != nil {
		common.SysError("kline evict idle: " + err.Error())
	}
}

func (e *Engine) evictAddress(address string) {
	address = normalizeAddress(address)
	if address == "" || e.hub.HasAnySubscriber(address) {
		return
	}
	e.mu.Lock()
	cur := e.open[address]
	delete(e.open, address)
	delete(e.dirty, address)
	e.mu.Unlock()
	if cur != nil && cur.TradeCount > 0 {
		if err := model.UpsertKlines([]model.Kline{cur.ToModel()}); err != nil {
			common.SysError("kline evict address: " + err.Error())
		}
	}
}

// Shutdown stops background workers and persists open candles.
func (e *Engine) Shutdown() error {
	select {
	case <-e.stop:
	default:
		close(e.stop)
	}
	return e.FlushOpen()
}

// FlushOpen persists all in-memory open 1m candles (e.g. on shutdown).
func (e *Engine) FlushOpen() error {
	e.mu.Lock()
	rows := make([]model.Kline, 0, len(e.open))
	for _, c := range e.open {
		if c != nil && c.TradeCount > 0 {
			rows = append(rows, c.ToModel())
		}
	}
	e.mu.Unlock()
	return model.UpsertKlines(rows)
}

func (e *Engine) GetOpenCandle(address, period string) (Candle, bool) {
	return e.buildOpenCandle(address, period, nil)
}

// List returns historical klines merged with the open candle when applicable.
func (e *Engine) List(address, period string, startMs, endMs int64) ([]Candle, error) {
	address = normalizeAddress(address)
	period, err := NormalizePeriod(period)
	if err != nil {
		return nil, err
	}
	startSec := startMs / 1000
	endSec := endMs / 1000
	if endSec <= 0 {
		endSec = time.Now().Unix()
	}

	var base []Candle
	if period == Period1m {
		rows, err := model.ListKlines(address, Period1m, startSec, endSec)
		if err != nil {
			return nil, err
		}
		base = make([]Candle, 0, len(rows))
		for _, row := range rows {
			base = append(base, CandleFromModel(row))
		}
	} else {
		oneMin, err := model.ListKlines(address, Period1m, startSec, endSec)
		if err != nil {
			return nil, err
		}
		tmp := make([]Candle, 0, len(oneMin))
		for _, row := range oneMin {
			tmp = append(tmp, CandleFromModel(row))
		}
		base, err = AggregateCandles(tmp, period)
		if err != nil {
			return nil, err
		}
	}

	if open, ok := e.GetOpenCandle(address, period); ok {
		if open.BeginTime >= startSec && open.BeginTime <= endSec {
			merged := false
			for i := range base {
				if base[i].BeginTime == open.BeginTime {
					base[i] = open
					merged = true
					break
				}
			}
			if !merged {
				base = append(base, open)
			}
		}
	}
	return PrepareChartCandles(base, period, startSec, endSec)
}

type BackfillResult struct {
	TokensProcessed int      `json:"tokensProcessed"`
	CandlesWritten  int      `json:"candlesWritten"`
	TradesScanned   int      `json:"tradesScanned"`
	Errors          []string `json:"errors,omitempty"`
}

// BackfillOptions controls batch kline rebuild from trades.
type BackfillOptions struct {
	Addresses   []string
	Replace     bool
	BatchTrades int
}

// Backfill rebuilds 1m klines from trades. Higher periods are derived on read.
func (e *Engine) Backfill(ctx context.Context, opt BackfillOptions) (BackfillResult, error) {
	result := BackfillResult{}
	addresses := opt.Addresses
	if len(addresses) == 0 {
		var err error
		addresses, err = model.ListDistinctTradeTokenAddresses()
		if err != nil {
			return result, err
		}
	}
	batch := opt.BatchTrades
	if batch < 1 {
		batch = 5000
	}

	for _, raw := range addresses {
		select {
		case <-ctx.Done():
			return result, ctx.Err()
		default:
		}
		address := normalizeAddress(raw)
		if address == "" {
			continue
		}
		has, err := model.TokenHasTrades(address)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", address, err))
			continue
		}
		if !has {
			continue
		}
		if opt.Replace {
			if err := model.DeleteKlinesForToken(address, Period1m); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s delete: %v", address, err))
				continue
			}
		}

		written, scanned, err := e.backfillToken(ctx, address, batch)
		result.TradesScanned += scanned
		result.CandlesWritten += written
		result.TokensProcessed++
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", address, err))
		}
	}
	return result, nil
}

func (e *Engine) backfillToken(ctx context.Context, address string, batch int) (candles int, trades int, err error) {
	type key struct {
		begin int64
	}
	buckets := make(map[key]*Candle)
	order := make([]key, 0)

	var afterID int64
	for {
		select {
		case <-ctx.Done():
			return candles, trades, ctx.Err()
		default:
		}
		chunk, err := model.ListTradesByTokenAsc(address, afterID, batch)
		if err != nil {
			return candles, trades, err
		}
		if len(chunk) == 0 {
			break
		}
		for _, trade := range chunk {
			trades++
			begin, err := BucketBeginSec(trade.TradeTime, Period1m)
			if err != nil {
				continue
			}
			k := key{begin: begin}
			cur, ok := buckets[k]
			if !ok {
				end, _ := BucketEndSec(begin, Period1m)
				cur = &Candle{
					TokenAddress: address,
					Period:       Period1m,
					BeginTime:    begin,
					EndTime:      end,
				}
				buckets[k] = cur
				order = append(order, k)
			}
			_ = cur.ApplyTrade(trade)
		}
		afterID = chunk[len(chunk)-1].ID
		if len(chunk) < batch {
			break
		}
	}

	rows := make([]model.Kline, 0, 256)
	flush := func() error {
		if len(rows) == 0 {
			return nil
		}
		if err := model.UpsertKlines(rows); err != nil {
			return err
		}
		candles += len(rows)
		rows = rows[:0]
		return nil
	}

	for _, k := range order {
		c := buckets[k]
		if c == nil || c.TradeCount == 0 {
			continue
		}
		rows = append(rows, c.ToModel())
		if len(rows) >= 200 {
			if err := flush(); err != nil {
				return candles, trades, err
			}
		}
	}
	if err := flush(); err != nil {
		return candles, trades, err
	}
	return candles, trades, nil
}
