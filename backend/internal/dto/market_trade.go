package dto

// Trade DTOs — web/lib/apis/meme-server/types.ts

// TradeLatestResponse aligns with LatestTradeDto — GET /market/trade/latest
type TradeLatestResponse struct {
	Hash      string `json:"hash"`
	Symbol    string `json:"symbol"`
	Name      string `json:"name"`
	Address   string `json:"address"`
	Account   string `json:"account"`
	Side      string `json:"side"`
	Amount    string `json:"amount"`
	Volume    string `json:"volume"`
	Price     string `json:"price"`
	TradeTime int64  `json:"tradeTime"`
	Source    string `json:"source"`
}

// TokenTradeResponse aligns with TokenTradeDto — GET /market/token/trades
type TokenTradeResponse struct {
	Hash      string `json:"hash"`
	Address   string `json:"address"`
	Account   string `json:"account"`
	Side      string `json:"side"`
	Amount    string `json:"amount"`
	Volume    string `json:"volume"`
	Price     string `json:"price"`
	TradeTime int64  `json:"tradeTime"`
	Source    string `json:"source"`
}
