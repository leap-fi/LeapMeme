package dto

// UserPositionResponse aligns with web/lib/apis/meme-server/types.ts UserPositionDto
// Used by GET /market/user/positions and GET /market/token/positions
type UserPositionResponse struct {
	ID                    string  `json:"id"`
	TokenID               *int64  `json:"tokenId,omitempty"`
	Address               string  `json:"address"`
	Symbol                string  `json:"symbol"`
	Name                  string  `json:"name"`
	Logo                  *string `json:"logo,omitempty"`
	Decimals              *string `json:"decimals,omitempty"`
	Account               string  `json:"account"`
	HoldAmount            string  `json:"holdAmount"`
	TotalProfit           string  `json:"totalProfit"`
	LastActiveTime        *int64  `json:"lastActiveTime,omitempty"`
	Price                 *string `json:"price,omitempty"`
	PriceChangePercent24h *string `json:"priceChangePercent24h,omitempty"`
	ChangePercent24h      *string `json:"changePercent24h,omitempty"`
	ChangePercent         *string `json:"changePercent,omitempty"`
}

// UserRewardResponse aligns with web/lib/apis/meme-server/types.ts UserRewardDto
type UserRewardResponse struct {
	TokenID        *int64  `json:"tokenId,omitempty"`
	Address        string  `json:"address"`
	Symbol         string  `json:"symbol"`
	Name           string  `json:"name"`
	Logo           *string `json:"logo,omitempty"`
	TradeVolume24h *string `json:"tradeVolume24h,omitempty"`
	AccruedAmount  *string `json:"accruedAmount,omitempty"`
}
