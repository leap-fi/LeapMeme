package indexer

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum"
	ethcommon "github.com/ethereum/go-ethereum/common"
	"github.com/leap/backend/internal/dto"
)

const ltReadConcurrency = 12

var (
	marketsCache    []dto.AccountMarketResponse
	marketsCacheAt  time.Time
	marketsCacheMu  sync.RWMutex
	marketsCacheTTL = 5 * time.Minute
)

// LoadAccountMarkets reads leveraged tokens from chain and groups by underlying.
func LoadAccountMarkets(ctx context.Context, cfg Config) ([]dto.AccountMarketResponse, error) {
	marketsCacheMu.RLock()
	if len(marketsCache) > 0 && time.Since(marketsCacheAt) < marketsCacheTTL {
		out := append([]dto.AccountMarketResponse(nil), marketsCache...)
		marketsCacheMu.RUnlock()
		return out, nil
	}
	marketsCacheMu.RUnlock()

	scanner, err := NewScanner(cfg)
	if err != nil {
		return nil, err
	}
	defer scanner.Close()

	lts, err := scanner.listLeveragedTokenAddresses(ctx)
	if err != nil {
		return nil, err
	}

	type ltInfo struct {
		dto.AccountLeverageTokenResponse
		underlying string
	}

	infos := make([]ltInfo, 0, len(lts))
	var infosMu sync.Mutex
	sem := make(chan struct{}, ltReadConcurrency)
	var wg sync.WaitGroup

	for _, lt := range lts {
		wg.Add(1)
		go func(lt ethcommon.Address) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			if ctx.Err() != nil {
				return
			}

			info, err := scanner.readAccountLeverageToken(ctx, lt)
			if err != nil {
				return
			}
			underlying := parseUnderlyingSymbol(info.TargetAsset)
			if underlying == "" {
				return
			}

			infosMu.Lock()
			infos = append(infos, ltInfo{AccountLeverageTokenResponse: info, underlying: underlying})
			infosMu.Unlock()
		}(lt)
	}
	wg.Wait()

	grouped := make(map[string]*dto.AccountMarketResponse)
	for _, item := range infos {
		market, ok := grouped[item.underlying]
		if !ok {
			grouped[item.underlying] = &dto.AccountMarketResponse{
				Symbol:   item.underlying,
				Address:  item.underlying,
				Name:     item.underlying,
				Icon:     marketIconFor(item.underlying),
				Chain:    "hyperliquid",
				Leverage: []dto.AccountLeverageTokenResponse{},
			}
			market = grouped[item.underlying]
		}
		market.Leverage = append(market.Leverage, item.AccountLeverageTokenResponse)
	}

	out := make([]dto.AccountMarketResponse, 0, len(grouped))
	for _, market := range grouped {
		sort.Slice(market.Leverage, func(i, j int) bool {
			left := market.Leverage[i]
			right := market.Leverage[j]
			if left.TargetLeverage != right.TargetLeverage {
				return left.TargetLeverage < right.TargetLeverage
			}
			if left.IsLong != right.IsLong {
				return left.IsLong
			}
			return left.Symbol < right.Symbol
		})
		out = append(out, *market)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Symbol < out[j].Symbol
	})

	marketsCacheMu.Lock()
	marketsCache = out
	marketsCacheAt = time.Now()
	marketsCacheMu.Unlock()

	return out, nil
}

func (s *Scanner) listLeveragedTokenAddresses(ctx context.Context) ([]ethcommon.Address, error) {
	if s.cfg.BondingAddress == "" {
		return nil, fmt.Errorf("bonding address not configured")
	}
	extraABI, err := parseBondingExtraABI()
	if err != nil {
		return nil, err
	}
	globalABI, err := parseBounceGlobalStorageABI()
	if err != nil {
		return nil, err
	}
	factoryABI, err := parseBounceFactoryABI()
	if err != nil {
		return nil, err
	}

	bonding := ethcommon.HexToAddress(s.cfg.BondingAddress)
	data, err := extraABI.Pack("bounceGlobalStorage")
	if err != nil {
		return nil, err
	}
	out, err := s.client.CallContract(ctx, ethereum.CallMsg{To: &bonding, Data: data}, nil)
	if err != nil {
		return nil, err
	}
	values, err := extraABI.Unpack("bounceGlobalStorage", out)
	if err != nil || len(values) == 0 {
		return nil, err
	}
	globalStorage, ok := values[0].(ethcommon.Address)
	if !ok {
		return nil, fmt.Errorf("invalid global storage address")
	}

	data, err = globalABI.Pack("factory")
	if err != nil {
		return nil, err
	}
	out, err = s.client.CallContract(ctx, ethereum.CallMsg{To: &globalStorage, Data: data}, nil)
	if err != nil {
		return nil, err
	}
	values, err = globalABI.Unpack("factory", out)
	if err != nil || len(values) == 0 {
		return nil, err
	}
	factory, ok := values[0].(ethcommon.Address)
	if !ok {
		return nil, fmt.Errorf("invalid factory address")
	}

	data, err = factoryABI.Pack("lts")
	if err != nil {
		return nil, err
	}
	out, err = s.client.CallContract(ctx, ethereum.CallMsg{To: &factory, Data: data}, nil)
	if err != nil {
		return nil, err
	}
	values, err = factoryABI.Unpack("lts", out)
	if err != nil || len(values) == 0 {
		return nil, err
	}
	addrs, ok := values[0].([]ethcommon.Address)
	if !ok {
		return nil, fmt.Errorf("invalid lts response")
	}
	return addrs, nil
}

func (s *Scanner) readAccountLeverageToken(ctx context.Context, lt ethcommon.Address) (dto.AccountLeverageTokenResponse, error) {
	state, err := s.readLtMarketState(ctx, lt)
	if err != nil {
		return dto.AccountLeverageTokenResponse{}, err
	}
	if state.TargetLeverage == 0 || (state.TargetLeverage != 2 && state.TargetLeverage != 3 && state.TargetLeverage != 5) {
		return dto.AccountLeverageTokenResponse{}, fmt.Errorf("unsupported leverage")
	}

	symbol, name := s.readTokenMeta(ctx, lt)
	supply, _ := s.readRawTotalSupply(ctx, lt)
	totalSupply := "0"
	if supply != nil {
		totalSupply = supply.String()
	}

	return dto.AccountLeverageTokenResponse{
		Address:        strings.ToLower(lt.Hex()),
		TargetLeverage: state.TargetLeverage,
		IsLong:         state.IsLong,
		Symbol:         symbol,
		Name:           name,
		Decimals:       18,
		TargetAsset:    state.TargetAsset,
		MintPaused:     state.MintPaused,
		ExchangeRate:   state.ExchangeRate,
		TotalSupply:    totalSupply,
		TotalAssets:    state.TotalAssets,
	}, nil
}

func parseUnderlyingSymbol(targetAsset string) string {
	raw := strings.TrimSpace(targetAsset)
	if raw == "" {
		return ""
	}
	if idx := strings.LastIndex(raw, ":"); idx >= 0 && idx < len(raw)-1 {
		return strings.ToUpper(strings.TrimSpace(raw[idx+1:]))
	}
	return strings.ToUpper(raw)
}

func marketIconFor(symbol string) string {
	// Icon is served from static assets later; empty is acceptable for now.
	_ = symbol
	return ""
}

// InvalidateMarketsCache clears the in-memory markets cache (for tests).
func InvalidateMarketsCache() {
	marketsCacheMu.Lock()
	marketsCache = nil
	marketsCacheAt = time.Time{}
	marketsCacheMu.Unlock()
}
