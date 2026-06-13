package kline

import "sync"

var (
	defaultMu sync.RWMutex
	defaultEngine *Engine
)

// InitDefault creates the process-wide kline engine and hub.
func InitDefault() *Engine {
	defaultMu.Lock()
	defer defaultMu.Unlock()
	if defaultEngine != nil {
		return defaultEngine
	}
	hub := NewHub()
	defaultEngine = NewEngine(hub)
	return defaultEngine
}

// Default returns the singleton engine (may be nil before InitDefault).
func Default() *Engine {
	defaultMu.RLock()
	defer defaultMu.RUnlock()
	return defaultEngine
}
