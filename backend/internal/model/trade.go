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

// ListTradesByTokenAsc returns trades for kline backfill (ascending by id).
func ListTradesByTokenAsc(tokenAddress string, afterID int64, limit int) ([]Trade, error) {
	tokenAddress = strings.ToLower(strings.TrimSpace(tokenAddress))
	if tokenAddress == "" {
		return []Trade{}, nil
	}
	if limit < 1 {
		limit = 5000
	}
	if limit > 20000 {
		limit = 20000
	}
	var trades []Trade
	q := DB.Where("LOWER(token_address) = ?", tokenAddress)
	if afterID > 0 {
		q = q.Where("id > ?", afterID)
	}
	if err := q.Order("id ASC").Limit(limit).Find(&trades).Error; err != nil {
		return nil, err
	}
	return trades, nil
}

// ListDistinctTradeTokenAddresses returns all token addresses seen in trades.
func ListDistinctTradeTokenAddresses() ([]string, error) {
	var addresses []string
	err := DB.Model(&Trade{}).
		Distinct("LOWER(token_address)").
		Pluck("LOWER(token_address)", &addresses).Error
	if err != nil {
		return nil, err
	}
	return addresses, nil
}

// TokenHasTrades checks whether trades exist for a token address.
func TokenHasTrades(tokenAddress string) (bool, error) {
	tokenAddress = strings.ToLower(strings.TrimSpace(tokenAddress))
	if tokenAddress == "" {
		return false, nil
	}
	var count int64
	err := DB.Model(&Trade{}).Where("LOWER(token_address) = ?", tokenAddress).Limit(1).Count(&count).Error
	return count > 0, err
}

// TokenVolumeStats aggregates trade volume for token list endpoints.
type TokenVolumeStats struct {
	TokenAddress   string
	TotalVolume    float64
	Volume24h      float64
	BuyVolume24h   float64
	SellVolume24h  float64
	TradeCount     int64
	TradeCount24h  int64
	BuyCount24h    int64
	SellCount24h   int64
	PriceChange24h float64
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
		BuyVolume24h  float64
		SellVolume24h float64
		TradeCount    int64
		TradeCount24h int64
		BuyCount24h   int64
		SellCount24h  int64
	}
	var rows []row
	err := DB.Model(&Trade{}).
		Select(`
			LOWER(token_address) AS token_address,
			COALESCE(SUM(CAST(volume AS DECIMAL(36,18))), 0) AS total_volume,
			COALESCE(SUM(CASE WHEN trade_time >= ? THEN CAST(volume AS DECIMAL(36,18)) ELSE 0 END), 0) AS volume24h,
			COALESCE(SUM(CASE WHEN trade_time >= ? AND side = 'BUY' THEN CAST(volume AS DECIMAL(36,18)) ELSE 0 END), 0) AS buy_volume24h,
			COALESCE(SUM(CASE WHEN trade_time >= ? AND side = 'SELL' THEN CAST(volume AS DECIMAL(36,18)) ELSE 0 END), 0) AS sell_volume24h,
			COUNT(*) AS trade_count,
			COALESCE(SUM(CASE WHEN trade_time >= ? THEN 1 ELSE 0 END), 0) AS trade_count24h,
			COALESCE(SUM(CASE WHEN trade_time >= ? AND side = 'BUY' THEN 1 ELSE 0 END), 0) AS buy_count24h,
			COALESCE(SUM(CASE WHEN trade_time >= ? AND side = 'SELL' THEN 1 ELSE 0 END), 0) AS sell_count24h`,
			since24h, since24h, since24h, since24h, since24h, since24h).
		Where("LOWER(token_address) IN ?", normalized).
		Group("LOWER(token_address)").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	for _, r := range rows {
		priceChange, _ := calcTokenPriceChange24h(r.TokenAddress, since24h)
		out[strings.ToLower(r.TokenAddress)] = TokenVolumeStats{
			TokenAddress:   r.TokenAddress,
			TotalVolume:    r.TotalVolume,
			Volume24h:      r.Volume24h,
			BuyVolume24h:   r.BuyVolume24h,
			SellVolume24h:  r.SellVolume24h,
			TradeCount:     r.TradeCount,
			TradeCount24h:  r.TradeCount24h,
			BuyCount24h:    r.BuyCount24h,
			SellCount24h:   r.SellCount24h,
			PriceChange24h: priceChange,
		}
	}
	return out, nil
}

const (
	TokenPositionsLimit     = 50
	TokenPositionCandidates = 200
	UserPositionCandidates  = 100
	tradeFeeBps             = 75
	creatorFeeShareBps       = 3333
	feeBpsDenominator        = 10000
)

// TokenDetailStats aggregates trade metrics for token detail / trending.
type TokenDetailStats struct {
	TotalVolume        float64
	Volume24h          float64
	BuyVolume24h       float64
	SellVolume24h      float64
	TradeCount         int64
	TradeCount24h      int64
	BuyCount24h        int64
	SellCount24h       int64
	TradeUserCount     int64
	PriceChange24h     float64
	CreatorFeeAccrued  float64
}

func GetTokenDetailStats(tokenAddress string) (TokenDetailStats, error) {
	tokenAddress = strings.ToLower(strings.TrimSpace(tokenAddress))
	if tokenAddress == "" {
		return TokenDetailStats{}, nil
	}

	since24h := time.Now().Add(-24 * time.Hour).UnixMilli()

	type aggRow struct {
		TotalVolume    float64
		Volume24h      float64
		BuyVolume24h   float64
		SellVolume24h  float64
		TradeCount     int64
		TradeCount24h  int64
		BuyCount24h    int64
		SellCount24h   int64
		TradeUserCount int64
		CreatorFee     float64
	}
	var row aggRow
	err := DB.Model(&Trade{}).
		Select(`
			COALESCE(SUM(CAST(volume AS DECIMAL(36,18))), 0) AS total_volume,
			COALESCE(SUM(CASE WHEN trade_time >= ? THEN CAST(volume AS DECIMAL(36,18)) ELSE 0 END), 0) AS volume24h,
			COALESCE(SUM(CASE WHEN trade_time >= ? AND side = 'BUY' THEN CAST(volume AS DECIMAL(36,18)) ELSE 0 END), 0) AS buy_volume24h,
			COALESCE(SUM(CASE WHEN trade_time >= ? AND side = 'SELL' THEN CAST(volume AS DECIMAL(36,18)) ELSE 0 END), 0) AS sell_volume24h,
			COUNT(*) AS trade_count,
			COALESCE(SUM(CASE WHEN trade_time >= ? THEN 1 ELSE 0 END), 0) AS trade_count24h,
			COALESCE(SUM(CASE WHEN trade_time >= ? AND side = 'BUY' THEN 1 ELSE 0 END), 0) AS buy_count24h,
			COALESCE(SUM(CASE WHEN trade_time >= ? AND side = 'SELL' THEN 1 ELSE 0 END), 0) AS sell_count24h,
			COUNT(DISTINCT account) AS trade_user_count,
			COALESCE(SUM(CAST(volume AS DECIMAL(36,18)) * ? / ? * ? / ?), 0) AS creator_fee`,
			since24h, since24h, since24h, since24h, since24h, since24h,
			tradeFeeBps, feeBpsDenominator, creatorFeeShareBps, feeBpsDenominator).
		Where("LOWER(token_address) = ?", tokenAddress).
		Scan(&row).Error
	if err != nil {
		return TokenDetailStats{}, err
	}

	priceChange, _ := calcTokenPriceChange24h(tokenAddress, since24h)

	return TokenDetailStats{
		TotalVolume:       row.TotalVolume,
		Volume24h:         row.Volume24h,
		BuyVolume24h:      row.BuyVolume24h,
		SellVolume24h:     row.SellVolume24h,
		TradeCount:        row.TradeCount,
		TradeCount24h:     row.TradeCount24h,
		BuyCount24h:       row.BuyCount24h,
		SellCount24h:      row.SellCount24h,
		TradeUserCount:    row.TradeUserCount,
		PriceChange24h:    priceChange,
		CreatorFeeAccrued: row.CreatorFee,
	}, nil
}

func calcTokenPriceChange24h(tokenAddress string, since24h int64) (float64, error) {
	var oldest Trade
	err := DB.Where("LOWER(token_address) = ? AND trade_time >= ?", tokenAddress, since24h).
		Order("trade_time ASC").
		Limit(1).
		Find(&oldest).Error
	if err != nil {
		return 0, err
	}
	if oldest.ID == 0 {
		return 0, nil
	}

	var latest Trade
	err = DB.Where("LOWER(token_address) = ? AND trade_time >= ?", tokenAddress, since24h).
		Order("trade_time DESC").
		Limit(1).
		Find(&latest).Error
	if err != nil {
		return 0, err
	}

	oldPrice := ParseDecimalString(oldest.Price)
	newPrice := ParseDecimalString(latest.Price)
	if oldPrice <= 0 || newPrice <= 0 {
		return 0, nil
	}
	return (newPrice - oldPrice) / oldPrice, nil
}

func GetDistinctAccountsByToken(tokenAddress string, limit int) ([]string, error) {
	tokenAddress = strings.ToLower(strings.TrimSpace(tokenAddress))
	if tokenAddress == "" {
		return []string{}, nil
	}
	if limit < 1 {
		limit = TokenPositionCandidates
	}
	var accounts []string
	err := DB.Model(&Trade{}).
		Select("DISTINCT account").
		Where("LOWER(token_address) = ?", tokenAddress).
		Limit(limit).
		Pluck("account", &accounts).Error
	if err != nil {
		return nil, err
	}
	return accounts, nil
}

func GetDistinctTokensByAccount(account string, limit int) ([]string, error) {
	account = strings.ToLower(strings.TrimSpace(account))
	if account == "" {
		return []string{}, nil
	}
	if limit < 1 {
		limit = UserPositionCandidates
	}
	var addresses []string
	err := DB.Model(&Trade{}).
		Select("DISTINCT token_address").
		Where("LOWER(account) = ?", account).
		Limit(limit).
		Pluck("token_address", &addresses).Error
	if err != nil {
		return nil, err
	}
	return addresses, nil
}

// GetNetHoldByAccountToken sums BUY amounts minus SELL amounts from indexed trades.
func GetNetHoldByAccountToken(account, tokenAddress string) (string, error) {
	account = strings.ToLower(strings.TrimSpace(account))
	tokenAddress = strings.ToLower(strings.TrimSpace(tokenAddress))
	if account == "" || tokenAddress == "" {
		return "0", nil
	}

	type row struct {
		NetHold float64
	}
	var result row
	err := DB.Model(&Trade{}).
		Select(`
			COALESCE(SUM(
				CASE
					WHEN side = 'BUY' THEN CAST(amount AS DECIMAL(36,18))
					WHEN side = 'SELL' THEN -CAST(amount AS DECIMAL(36,18))
					ELSE 0
				END
			), 0) AS net_hold`).
		Where("LOWER(account) = ? AND LOWER(token_address) = ?", account, tokenAddress).
		Scan(&result).Error
	if err != nil {
		return "", err
	}
	if result.NetHold <= 0 {
		return "0", nil
	}
	return formatDecimalFloat(result.NetHold), nil
}

func GetNetHoldsByToken(tokenAddress string, accounts []string, limit int) (map[string]string, error) {
	out := make(map[string]string)
	tokenAddress = strings.ToLower(strings.TrimSpace(tokenAddress))
	if tokenAddress == "" || len(accounts) == 0 {
		return out, nil
	}

	normalized := make([]string, 0, len(accounts))
	for _, account := range accounts {
		account = strings.ToLower(strings.TrimSpace(account))
		if account != "" {
			normalized = append(normalized, account)
		}
	}
	if len(normalized) == 0 {
		return out, nil
	}

	type row struct {
		Account string
		NetHold float64
	}
	var rows []row
	err := DB.Model(&Trade{}).
		Select(`
			LOWER(account) AS account,
			COALESCE(SUM(
				CASE
					WHEN side = 'BUY' THEN CAST(amount AS DECIMAL(36,18))
					WHEN side = 'SELL' THEN -CAST(amount AS DECIMAL(36,18))
					ELSE 0
				END
			), 0) AS net_hold`).
		Where("LOWER(token_address) = ? AND LOWER(account) IN ?", tokenAddress, normalized).
		Group("LOWER(account)").
		Having("net_hold > 0").
		Order("net_hold DESC").
		Limit(limit).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		out[row.Account] = formatDecimalFloat(row.NetHold)
	}
	return out, nil
}

func GetNetHoldTokensByAccount(account string, limit int) (map[string]string, error) {
	out := make(map[string]string)
	account = strings.ToLower(strings.TrimSpace(account))
	if account == "" {
		return out, nil
	}
	if limit < 1 {
		limit = UserPositionCandidates
	}

	type row struct {
		TokenAddress string
		NetHold      float64
	}
	var rows []row
	err := DB.Model(&Trade{}).
		Select(`
			LOWER(token_address) AS token_address,
			COALESCE(SUM(
				CASE
					WHEN side = 'BUY' THEN CAST(amount AS DECIMAL(36,18))
					WHEN side = 'SELL' THEN -CAST(amount AS DECIMAL(36,18))
					ELSE 0
				END
			), 0) AS net_hold`).
		Where("LOWER(account) = ?", account).
		Group("LOWER(token_address)").
		Having("net_hold > 0").
		Order("net_hold DESC").
		Limit(limit).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		out[row.TokenAddress] = formatDecimalFloat(row.NetHold)
	}
	return out, nil
}

func GetCreatorRewardStatsByCreator(creator string) (map[string]TokenDetailStats, error) {
	creator = strings.ToLower(strings.TrimSpace(creator))
	out := make(map[string]TokenDetailStats)
	if creator == "" {
		return out, nil
	}

	type row struct {
		TokenAddress  string
		Volume24h     float64
		CreatorFee    float64
	}
	var rows []row
	err := DB.Model(&Trade{}).
		Select(`
			LOWER(token_address) AS token_address,
			COALESCE(SUM(CASE WHEN trade_time >= ? THEN CAST(volume AS DECIMAL(36,18)) ELSE 0 END), 0) AS volume24h,
			COALESCE(SUM(CAST(volume AS DECIMAL(36,18)) * ? / ? * ? / ?), 0) AS creator_fee`,
			time.Now().Add(-24*time.Hour).UnixMilli(),
			tradeFeeBps, feeBpsDenominator, creatorFeeShareBps, feeBpsDenominator).
		Joins("JOIN tokens ON LOWER(tokens.address) = LOWER(trades.token_address)").
		Where("LOWER(tokens.creator) = ?", creator).
		Group("LOWER(token_address)").
		Having("creator_fee > 0").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	for _, r := range rows {
		out[strings.ToLower(r.TokenAddress)] = TokenDetailStats{
			Volume24h:         r.Volume24h,
			CreatorFeeAccrued: r.CreatorFee,
		}
	}
	return out, nil
}
