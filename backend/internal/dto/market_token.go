package dto

// TokenNewResponse aligns with web/lib/apis/meme-server/types.ts TokenNewDto
type TokenNewResponse struct {
	Address               string  `json:"address"`
	Symbol                string  `json:"symbol"`
	Name                  string  `json:"name"`
	TotalSupply           *string `json:"totalSupply,omitempty"`
	Decimals              *int    `json:"decimals,omitempty"`
	Logo                  *string `json:"logo,omitempty"`
	Creator               *string `json:"creator,omitempty"`
	Description           *string `json:"description,omitempty"`
	ShowName              *bool   `json:"showName,omitempty"`
	Twitter               *string `json:"twitter,omitempty"`
	Telegram              *string `json:"telegram,omitempty"`
	Website               *string `json:"website,omitempty"`
	BlockNumber           *int64  `json:"blockNumber,omitempty"`
	Hash                  *string `json:"hash,omitempty"`
	Source                *string `json:"source,omitempty"`
	Dex                   *string `json:"dex,omitempty"`
	Timestamp             *int64  `json:"timestamp,omitempty"`
	MigrateTime           *int64  `json:"migrateTime,omitempty"`
	CompleteTime          *int64  `json:"completeTime,omitempty"`
	GraduatingTime        *int64  `json:"graduatingTime,omitempty"`
	GraduatedTime         *int64  `json:"graduatedTime,omitempty"`
	MarketCap             *string `json:"marketCap,omitempty"`
	TradeVolume           *string `json:"tradeVolume,omitempty"`
	TradeCount            *int    `json:"tradeCount,omitempty"`
	Top10Holder           *string `json:"top10Holder,omitempty"`
	BondingCurveProgress  *string `json:"bondingCurveProgress,omitempty"`
	Status                *string `json:"status,omitempty"`
	TradeVolume24h        *string `json:"tradeVolume24h,omitempty"`
	BuyVolume24h          *string `json:"buyVolume24h,omitempty"`
	SellVolume24h         *string `json:"sellVolume24h,omitempty"`
	TradeCount24h         *int    `json:"tradeCount24h,omitempty"`
	BuyCount24h           *int    `json:"buyCount24h,omitempty"`
	SellCount24h          *int    `json:"sellCount24h,omitempty"`
	Liquidity             *string `json:"liquidity,omitempty"`
	TargetAsset           *string `json:"targetAsset,omitempty"`
	Underlying            *string `json:"underlying,omitempty"`
	TargetLeverage        *int    `json:"targetLeverage,omitempty"`
	Leverage              *int    `json:"leverage,omitempty"`
	IsLong                *bool   `json:"isLong,omitempty"`
	Direction             *string `json:"direction,omitempty"`
	PriceChangePercent24h *string `json:"priceChangePercent24h,omitempty"`
	Bonding               *string `json:"bonding,omitempty"`
	Zap                   *string `json:"zap,omitempty"`
	Router                *string `json:"router,omitempty"`
}

// TokenDetailResponse aligns with web/lib/apis/meme-server/token-detail.api.ts TokenDetailDto
type TokenDetailResponse struct {
	Address                     string  `json:"address"`
	Symbol                      string  `json:"symbol"`
	Name                        string  `json:"name"`
	LtAddress                   *string `json:"ltAddress,omitempty"`
	BondingCurve                *string `json:"bondingCurve,omitempty"`
	AssociatedBondingCurve      *string `json:"associatedBondingCurve,omitempty"`
	TotalSupply                 *string `json:"totalSupply,omitempty"`
	Decimals                    *string `json:"decimals,omitempty"`
	Logo                        *string `json:"logo,omitempty"`
	Creator                     *string `json:"creator,omitempty"`
	Description                 *string `json:"description,omitempty"`
	ShowName                    *string `json:"showName,omitempty"`
	Twitter                     *string `json:"twitter,omitempty"`
	Telegram                    *string `json:"telegram,omitempty"`
	Website                     *string `json:"website,omitempty"`
	BlockNumber                 *string `json:"blockNumber,omitempty"`
	Hash                        *string `json:"hash,omitempty"`
	Timestamp                   *string `json:"timestamp,omitempty"`
	Bonding                     *string `json:"bonding,omitempty"`
	Zap                         *string `json:"zap,omitempty"`
	Router                      *string `json:"router,omitempty"`
	Pool                        *string `json:"pool,omitempty"`
	Market                      *string `json:"market,omitempty"`
	Leverage                    *string `json:"leverage,omitempty"`
	Direction                   *string `json:"direction,omitempty"`
	Price                       *string `json:"price,omitempty"`
	MarketCap                   *string `json:"marketCap,omitempty"`
	Liquidity                   *string `json:"liquidity,omitempty"`
	TradeUserCount              *string `json:"tradeUserCount,omitempty"`
	TradeVolume                 *string `json:"tradeVolume,omitempty"`
	TradeVolume24h              *string `json:"tradeVolume24h,omitempty"`
	BuyVolume24h                *string `json:"buyVolume24h,omitempty"`
	SellVolume24h               *string `json:"sellVolume24h,omitempty"`
	BondingCurveProgress        *string `json:"bondingCurveProgress,omitempty"`
	BondingCurveVolumeUsd       *string `json:"bondingCurveVolumeUsd,omitempty"`
	BondingCurveVolume          *string `json:"bondingCurveVolume,omitempty"`
	BondingCurveVolumeUsdLegacy *string `json:"bonding_curve_volume_usd,omitempty"`
	TradeCount                  *string `json:"tradeCount,omitempty"`
	TradeCount24h               *string `json:"tradeCount24h,omitempty"`
	BuyCount24h                 *string `json:"buyCount24h,omitempty"`
	SellCount24h                *string `json:"sellCount24h,omitempty"`
	Top10Holder                 *string `json:"top10Holder,omitempty"`
	Status                      *string `json:"status,omitempty"`
	PriceChangePercent24h       *string `json:"priceChangePercent24h,omitempty"`
	IsExternal                  *bool   `json:"isExternal,omitempty"`
}
