package kline

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type subscription struct {
	period  string
	address string
}

type client struct {
	conn *websocket.Conn
	subs map[subscription]struct{}
}

// Hub tracks websocket subscribers and broadcasts candle updates.
type Hub struct {
	mu              sync.RWMutex
	clients         map[*client]struct{}
	onLastUnsub     func(address string)
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[*client]struct{}),
	}
}

func (h *Hub) Register(conn *websocket.Conn) *client {
	c := &client{
		conn: conn,
		subs: make(map[subscription]struct{}),
	}
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
	return c
}

func (h *Hub) Unregister(c *client) {
	if c == nil {
		return
	}
	addresses := make(map[string]struct{})
	h.mu.Lock()
	for sub := range c.subs {
		addresses[sub.address] = struct{}{}
	}
	delete(h.clients, c)
	h.mu.Unlock()
	for address := range addresses {
		h.notifyIfLastUnsub(address)
	}
}

// SetLastUnsubHook is called when an address has no remaining subscribers.
func (h *Hub) SetLastUnsubHook(fn func(address string)) {
	h.mu.Lock()
	h.onLastUnsub = fn
	h.mu.Unlock()
}

func (h *Hub) HasAnySubscriber(address string) bool {
	address = normalizeAddress(address)
	if address == "" {
		return false
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		for sub := range c.subs {
			if sub.address == address {
				return true
			}
		}
	}
	return false
}

// SubscribedPeriods returns distinct periods subscribed for an address.
func (h *Hub) SubscribedPeriods(address string) []string {
	address = normalizeAddress(address)
	if address == "" {
		return nil
	}
	seen := make(map[string]struct{})
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		for sub := range c.subs {
			if sub.address == address {
				seen[sub.period] = struct{}{}
			}
		}
	}
	out := make([]string, 0, len(seen))
	for p := range seen {
		out = append(out, p)
	}
	return out
}

func (h *Hub) notifyIfLastUnsub(address string) {
	if h.HasAnySubscriber(address) {
		return
	}
	h.mu.RLock()
	fn := h.onLastUnsub
	h.mu.RUnlock()
	if fn != nil {
		fn(address)
	}
}

func (h *Hub) Subscribe(c *client, period, address string) error {
	period, err := NormalizePeriod(period)
	if err != nil {
		return err
	}
	address = normalizeAddress(address)
	if address == "" {
		return errInvalidArgument
	}
	c.subs[subscription{period: period, address: address}] = struct{}{}
	return nil
}

func (h *Hub) Unsubscribe(c *client, period, address string) error {
	period, err := NormalizePeriod(period)
	if err != nil {
		return err
	}
	address = normalizeAddress(address)
	delete(c.subs, subscription{period: period, address: address})
	h.notifyIfLastUnsub(address)
	return nil
}

func (h *Hub) Broadcast(candle Candle) {
	if candle.TradeCount == 0 {
		return
	}
	msg := wsPushMessage{
		Arg: wsArg{
			Channel: "kline",
			Period:  candle.Period,
			Address: candle.TokenAddress,
		},
		Data: candleToDTO(candle),
	}
	raw, err := json.Marshal(msg)
	if err != nil {
		return
	}

	target := subscription{period: candle.Period, address: candle.TokenAddress}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		if _, ok := c.subs[target]; !ok {
			continue
		}
		_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
		if err := c.conn.WriteMessage(websocket.TextMessage, raw); err != nil {
			// drop; read loop will clean up
		}
	}
}

type wsClientMessage struct {
	Op   string  `json:"op"`
	Args []wsArg `json:"args"`
}

type wsArg struct {
	Channel string `json:"channel"`
	Period  string `json:"period"`
	Address string `json:"address"`
}

type wsAckMessage struct {
	Event string `json:"event"`
	Arg   wsArg  `json:"arg"`
	Code  int    `json:"code"`
	Msg   string `json:"msg"`
}

type wsPushMessage struct {
	Arg  wsArg   `json:"arg"`
	Data klineDTO `json:"data"`
}

type klineDTO struct {
	Period      string  `json:"period"`
	BeginTime   int64   `json:"beginTime"`
	EndTime     int64   `json:"endTime"`
	OpenPrice   float64 `json:"openPrice"`
	HighPrice   float64 `json:"highPrice"`
	LowPrice    float64 `json:"lowPrice"`
	ClosePrice  float64 `json:"closePrice"`
	Volume      float64 `json:"volume"`
	QuoteVolume float64 `json:"quoteVolume"`
	Count       uint32  `json:"count"`
}

func candleToDTO(c Candle) klineDTO {
	return klineDTO{
		Period:      c.Period,
		BeginTime:   c.BeginTime,
		EndTime:     c.EndTime,
		OpenPrice:   c.OpenPrice,
		HighPrice:   c.HighPrice,
		LowPrice:    c.LowPrice,
		ClosePrice:  c.ClosePrice,
		Volume:      c.Volume,
		QuoteVolume: c.QuoteVolume,
		Count:       c.TradeCount,
	}
}
