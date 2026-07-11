package model

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

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
	ZapAddress           string `gorm:"size:42;column:zap_address"`
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
			"creator", "lt_address", "bonding_address", "router_address", "zap_address",
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

func ListTradeTokenAddressesMissing() ([]string, error) {
	var addresses []string
	err := DB.Raw(`
		SELECT DISTINCT LOWER(t.token_address) AS address
		FROM trades t
		LEFT JOIN tokens tk ON LOWER(tk.address) = LOWER(t.token_address)
		WHERE tk.address IS NULL
	`).Scan(&addresses).Error
	if err != nil {
		return nil, err
	}
	return addresses, nil
}

func UpdateTokenCreator(address, creator string) error {
	address = strings.ToLower(strings.TrimSpace(address))
	creator = strings.ToLower(strings.TrimSpace(creator))
	if address == "" || creator == "" {
		return errors.New("address and creator required")
	}
	return DB.Model(&Token{}).
		Where("LOWER(address) = ?", address).
		Update("creator", creator).Error
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

func ListAllTokenAddresses() ([]string, error) {
	var addresses []string
	err := DB.Model(&Token{}).Pluck("address", &addresses).Error
	if err != nil {
		return nil, err
	}
	return addresses, nil
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

func CalcMarketCap(priceStr, supplyStr string) (string, bool) {
	return calcMarketCap(priceStr, supplyStr)
}

func calcMarketCap(priceStr, supplyStr string) (string, bool) {
	price := ParseDecimalString(priceStr)
	supply := ParseDecimalString(supplyStr)
	if price <= 0 || supply <= 0 {
		return "", false
	}
	return formatDecimalFloat(price * supply), true
}
