package dto

// AccountMarketResponse aligns with web/lib/account/types.ts AccountMarket
type AccountMarketResponse struct {
	Symbol      string                         `json:"symbol"`
	Address     string                         `json:"address"`
	Decimals    *int                           `json:"decimals,omitempty"`
	Name        string                         `json:"name"`
	Icon        string                         `json:"icon"`
	SafetyLevel *string                        `json:"safetyLevel,omitempty"`
	Warning     *bool                          `json:"warning,omitempty"`
	Chain       string                         `json:"chain,omitempty"`
	Leverage    []AccountLeverageTokenResponse `json:"leverage"`
	Price       *float64                       `json:"price,omitempty"`
	Change      *float64                       `json:"change,omitempty"`
	H24ChangePer *float64                      `json:"h24ChangePer,omitempty"`
}

// AccountLeverageTokenResponse aligns with web/lib/account/types.ts AccountLeverageToken
type AccountLeverageTokenResponse struct {
	Address        string `json:"address"`
	TargetLeverage int    `json:"targetLeverage"`
	IsLong         bool   `json:"isLong"`
	Symbol         string `json:"symbol"`
	Name           string `json:"name"`
	Decimals       int    `json:"decimals"`
	TargetAsset    string `json:"targetAsset"`
	MintPaused     bool   `json:"mintPaused"`
	ExchangeRate   string `json:"exchangeRate"`
	TotalSupply    string `json:"totalSupply"`
	TotalAssets    string `json:"totalAssets"`
}
