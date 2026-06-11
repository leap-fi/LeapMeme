package dto

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
}
