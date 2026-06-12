package dto

// NewTokensQuery aligns with web/lib/apis/meme-server/types.ts NewTokensQueryParams
// GET /market/token/tokens
type NewTokensQuery struct {
	Type              string `form:"type"`
	PageNum           string `form:"pageNum"`
	PageSize          string `form:"pageSize"`
	Market            string `form:"market"`
	Leverage          string `form:"leverage"`
	Direction         string `form:"direction"`
	SortField         string `form:"sortField"`
	SortOrder         string `form:"sortOrder"`
	MarketCapMin      string `form:"marketCapMin"`
	MarketCapMax      string `form:"marketCapMax"`
	TradeVolume24hMin string `form:"tradeVolume24hMin"`
	TradeVolume24hMax string `form:"tradeVolume24hMax"`
	TradeCount24hMin  string `form:"tradeCount24hMin"`
	TradeCount24hMax  string `form:"tradeCount24hMax"`
	BuyCount24hMin    string `form:"buyCount24hMin"`
	BuyCount24hMax    string `form:"buyCount24hMax"`
	SellCount24hMin   string `form:"sellCount24hMin"`
	SellCount24hMax   string `form:"sellCount24hMax"`
	LiquidityMin      string `form:"liquidityMin"`
	LiquidityMax      string `form:"liquidityMax"`
}

// TrendingTokensQuery aligns with web/lib/apis/meme-server/types.ts TrendingTokensQueryParams
// GET /market/token/trending
type TrendingTokensQuery struct {
	Search    string `form:"search"`
	Market    string `form:"market"`
	Leverage  string `form:"leverage"`
	Direction string `form:"direction"`
	SortField string `form:"sortField"`
	SortOrder string `form:"sortOrder"`
	PageNum   string `form:"pageNum"`
	PageSize  string `form:"pageSize"`
}

// TokenAddressQuery GET /market/token/detail, /market/token/trades, /market/token/positions
type TokenAddressQuery struct {
	Address string `form:"address" binding:"required"`
}

// UserAccountQuery GET /market/user/positions, /market/user/created
type UserAccountQuery struct {
	Account string `form:"account" binding:"required"`
}

// UserRewardsQuery GET /market/user/rewards
type UserRewardsQuery struct {
	Account  string `form:"account" binding:"required"`
	FeeVault string `form:"feeVault" binding:"required"`
}
