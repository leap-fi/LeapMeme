package model

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm/clause"
)

const (
	latestTradesLimit    = 50
	tokenTradesListLimit = 50
)

type Trade struct {
	ID           int64  `gorm:"primaryKey"`
	Hash         string `gorm:"size:66;uniqueIndex"`
	TokenAddress string `gorm:"size:42;column:token_address;index"`
	Symbol       string `gorm:"size:64"`
	Name         string `gorm:"size:128"`
	Account      string `gorm:"size:42;index"`
	Side         string `gorm:"size:8"`
	Amount       string `gorm:"size:64"`
	Volume       string `gorm:"size:64"`
	Price        string `gorm:"size:64"`
	Source       string `gorm:"size:32"`
	TradeTime    int64  `gorm:"column:trade_time;index"`
	BlockNumber  uint64 `gorm:"column:block_number"`
	CreatedAt    int64  `gorm:"column:created_at"`
}

func (Trade) TableName() string { return "trades" }

// Address is the API-facing token contract address.
func (t Trade) Address() string { return t.TokenAddress }

func InsertTradeIgnoreDuplicate(trade *Trade) error {
	if trade == nil {
		return errors.New("trade is nil")
	}
	if trade.CreatedAt == 0 {
		trade.CreatedAt = time.Now().UnixMilli()
	}
	if trade.Source == "" {
		trade.Source = "zap"
	}
	return DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "hash"}},
		DoNothing: true,
	}).Create(trade).Error
}

func GetLatestTrades() ([]Trade, error) {
	var trades []Trade
	if err := DB.Order("trade_time DESC").Limit(latestTradesLimit).Find(&trades).Error; err != nil {
		return nil, err
	}
	return trades, nil
}

func GetTradesByTokenAddress(tokenAddress string) ([]Trade, error) {
	tokenAddress = strings.TrimSpace(tokenAddress)
	if tokenAddress == "" {
		return []Trade{}, nil
	}
	var trades []Trade
	if err := DB.Where("LOWER(token_address) = LOWER(?)", tokenAddress).
		Order("trade_time DESC").
		Limit(tokenTradesListLimit).
		Find(&trades).Error; err != nil {
		return nil, err
	}
	return trades, nil
}

// TokenVolumeStats aggregates trade volume for token list endpoints.
type TokenVolumeStats struct {
	TokenAddress  string
	TotalVolume   float64
	Volume24h     float64
	TradeCount    int64
	TradeCount24h int64
}

func GetTradeVolumeStatsByTokens(addresses []string) (map[string]TokenVolumeStats, error) {
	out := make(map[string]TokenVolumeStats)
	if len(addresses) == 0 {
		return out, nil
	}

	normalized := make([]string, 0, len(addresses))
	for _, addr := range addresses {
		addr = strings.TrimSpace(addr)
		if addr != "" {
			normalized = append(normalized, strings.ToLower(addr))
		}
	}
	if len(normalized) == 0 {
		return out, nil
	}

	since24h := time.Now().Add(-24 * time.Hour).UnixMilli()

	type row struct {
		TokenAddress  string
		TotalVolume   float64
		Volume24h     float64
		TradeCount    int64
		TradeCount24h int64
	}
	var rows []row
	err := DB.Model(&Trade{}).
		Select(`
			LOWER(token_address) AS token_address,
			COALESCE(SUM(CAST(volume AS DECIMAL(36,18))), 0) AS total_volume,
			COALESCE(SUM(CASE WHEN trade_time >= ? THEN CAST(volume AS DECIMAL(36,18)) ELSE 0 END), 0) AS volume24h,
			COUNT(*) AS trade_count,
			COALESCE(SUM(CASE WHEN trade_time >= ? THEN 1 ELSE 0 END), 0) AS trade_count24h`,
			since24h, since24h).
		Where("LOWER(token_address) IN ?", normalized).
		Group("LOWER(token_address)").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	for _, r := range rows {
		out[strings.ToLower(r.TokenAddress)] = TokenVolumeStats{
			TokenAddress:  r.TokenAddress,
			TotalVolume:   r.TotalVolume,
			Volume24h:     r.Volume24h,
			TradeCount:    r.TradeCount,
			TradeCount24h: r.TradeCount24h,
		}
	}
	return out, nil
}
