package model

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const BondingCurveGraduationTargetUSD = 9000

type Token struct {
	ID                   int64  `gorm:"primaryKey"`
	Address              string `gorm:"size:42;uniqueIndex"`
	Symbol               string `gorm:"size:64"`
	Name                 string `gorm:"size:128"`
	Logo                 string `gorm:"size:512"`
	Description          string `gorm:"type:text"`
	Twitter              string `gorm:"size:256"`
	Telegram             string `gorm:"size:256"`
	Website              string `gorm:"size:256"`
	Creator              string `gorm:"size:42"`
	LtAddress            string `gorm:"size:42;column:lt_address"`
	BondingAddress       string `gorm:"size:42;column:bonding_address"`
	RouterAddress        string `gorm:"size:42;column:router_address"`
	TargetAsset          string `gorm:"size:128;column:target_asset"`
	TargetLeverage       *int   `gorm:"column:target_leverage"`
	IsLong               *bool  `gorm:"column:is_long"`
	TotalSupply          string `gorm:"size:64;column:total_supply"`
	LastPrice            string `gorm:"size:64;column:last_price"`
	MarketCap            string `gorm:"size:64;column:market_cap"`
	BondingCurveVolume   string `gorm:"size:64;column:bonding_curve_volume"`
	BondingCurveProgress string `gorm:"size:16;column:bonding_curve_progress"`
	GraduatedAt          int64  `gorm:"column:graduated_at"`
	TxHash               string `gorm:"size:66;column:tx_hash"`
	BlockNumber          uint64 `gorm:"column:block_number"`
	Status               string `gorm:"size:32"`
	CreatedAt            int64  `gorm:"column:created_at"`
}

func (Token) TableName() string { return "tokens" }

type TokenListFilter struct {
	Type      string
	Search    string
	Market    string
	Leverage  string
	Direction string
	SortField string
	SortOrder string
	Page      int
	PageSize  int
}

func UpsertToken(token *Token) error {
	if token == nil {
		return errors.New("token is nil")
	}
	if token.CreatedAt == 0 {
		token.CreatedAt = time.Now().UnixMilli()
	}
	if token.Status == "" {
		token.Status = "TRADING"
	}
	if token.BondingCurveVolume == "" {
		token.BondingCurveVolume = "0"
	}
	if token.BondingCurveProgress == "" {
		token.BondingCurveProgress = "0"
	}
	return DB.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "address"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"symbol", "name", "logo", "description", "twitter", "telegram", "website",
			"creator", "lt_address", "bonding_address", "router_address",
			"target_asset", "target_leverage", "is_long",
			"total_supply", "last_price", "market_cap",
			"bonding_curve_volume", "bonding_curve_progress", "graduated_at",
			"status", "tx_hash", "block_number",
		}),
	}).Create(token).Error
}

func GetTokenByAddress(address string) (*Token, error) {
	address = strings.TrimSpace(address)
	if address == "" {
		return nil, nil
	}
	var token Token
	err := DB.Where("LOWER(address) = LOWER(?)", address).First(&token).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &token, nil
}

func GetTokensByCreator(creator string) ([]Token, error) {
	creator = strings.TrimSpace(creator)
	if creator == "" {
		return []Token{}, nil
	}
	var tokens []Token
	err := DB.Where("LOWER(creator) = LOWER(?)", creator).
		Order("created_at DESC").
		Find(&tokens).Error
	if err != nil {
		return nil, err
	}
	return tokens, nil
}

func ListTokens(filter TokenListFilter) ([]Token, error) {
	q := DB.Model(&Token{})

	switch filter.Type {
	case "3":
		q = q.Where(
			"status IN ? OR CAST(bonding_curve_progress AS DECIMAL(10,4)) >= 100",
			[]string{"GRADUATED", "COMPLETED", "MIGRATED"},
		)
	case "1":
		q = q.Where(
			"status NOT IN ? AND (bonding_curve_progress IS NULL OR bonding_curve_progress = '' OR CAST(bonding_curve_progress AS DECIMAL(10,4)) < 100)",
			[]string{"GRADUATED", "COMPLETED", "MIGRATED"},
		)
	}

	if search := strings.TrimSpace(filter.Search); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		q = q.Where(
			"LOWER(address) LIKE ? OR LOWER(symbol) LIKE ? OR LOWER(name) LIKE ?",
			like, like, like,
		)
	}
	if market := strings.TrimSpace(filter.Market); market != "" && !strings.EqualFold(market, "all") {
		like := "%" + strings.ToLower(market) + "%"
		q = q.Where("LOWER(target_asset) LIKE ? OR LOWER(symbol) LIKE ?", like, like)
	}
	if lev := strings.TrimSpace(filter.Leverage); lev != "" {
		if n, err := strconv.Atoi(strings.TrimSuffix(lev, "x")); err == nil && n > 0 {
			q = q.Where("target_leverage = ?", n)
		}
	}
	switch strings.ToUpper(strings.TrimSpace(filter.Direction)) {
	case "LONG":
		q = q.Where("is_long = ?", true)
	case "SHORT":
		q = q.Where("is_long = ?", false)
	}

	order := "created_at DESC"
	switch filter.SortField {
	case "graduatedTime":
		order = "graduated_at DESC, created_at DESC"
	case "marketCap":
		order = "CAST(market_cap AS DECIMAL(36,18)) DESC, created_at DESC"
	}
	if strings.EqualFold(filter.SortOrder, "asc") {
		order = strings.Replace(order, "DESC", "ASC", 1)
	}
	q = q.Order(order)

	page := filter.Page
	if page < 1 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize < 1 {
		pageSize = 30
	}
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	var tokens []Token
	if err := q.Limit(pageSize).Offset(offset).Find(&tokens).Error; err != nil {
		return nil, err
	}
	return tokens, nil
}

func UpdateTokenAfterTrade(address string, lastPrice string, buyVolumeDelta float64) error {
	address = strings.ToLower(strings.TrimSpace(address))
	if address == "" {
		return nil
	}
	token, err := GetTokenByAddress(address)
	if err != nil || token == nil {
		return err
	}

	curveVol := ParseDecimalString(token.BondingCurveVolume)
	if buyVolumeDelta > 0 && !isGraduatedStatus(token.Status) {
		curveVol += buyVolumeDelta
	}
	progress := calcBondingCurveProgress(curveVol, token.Status)
	status := token.Status
	graduatedAt := token.GraduatedAt
	if progress >= 100 && !isGraduatedStatus(status) {
		status = "GRADUATED"
		if graduatedAt == 0 {
			graduatedAt = time.Now().UnixMilli()
		}
	}

	marketCap := token.MarketCap
	if lastPrice != "" && token.TotalSupply != "" {
		if mc, ok := calcMarketCap(lastPrice, token.TotalSupply); ok {
			marketCap = mc
		}
	}

	return DB.Model(&Token{}).Where("address = ?", address).Updates(map[string]any{
		"last_price":             lastPrice,
		"bonding_curve_volume":   formatDecimalFloat(curveVol),
		"bonding_curve_progress": formatProgress(progress),
		"market_cap":             marketCap,
		"status":                 status,
		"graduated_at":           graduatedAt,
	}).Error
}

func isGraduatedStatus(status string) bool {
	switch strings.ToUpper(status) {
	case "GRADUATED", "COMPLETED", "MIGRATED":
		return true
	default:
		return false
	}
}

func calcBondingCurveProgress(volume float64, status string) float64 {
	if isGraduatedStatus(status) {
		return 100
	}
	if volume <= 0 {
		return 0
	}
	p := volume / BondingCurveGraduationTargetUSD * 100
	if p > 100 {
		return 100
	}
	return p
}

func ParseDecimalString(s string) float64 {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0
	}
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return v
}

func formatDecimalFloat(v float64) string {
	if v == 0 {
		return "0"
	}
	return strconv.FormatFloat(v, 'f', -1, 64)
}

func formatProgress(v float64) string {
	return fmt.Sprintf("%.4f", v)
}

func calcMarketCap(priceStr, supplyStr string) (string, bool) {
	price := ParseDecimalString(priceStr)
	supply := ParseDecimalString(supplyStr)
	if price <= 0 || supply <= 0 {
		return "", false
	}
	return formatDecimalFloat(price * supply), true
}
