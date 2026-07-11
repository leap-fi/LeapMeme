package dto

type ProtocolConfigResponse struct {
	GraduationTargetUsdc string   `json:"graduationTargetUsdc"`
	MinSeedUsdc          string   `json:"minSeedUsdc"`
	MaxSeedUsdc          string   `json:"maxSeedUsdc"`
	MinBuyUsdc           string   `json:"minBuyUsdc"`
	MinSellUsdc          string   `json:"minSellUsdc"`
	MaxTradeUsdc         *string  `json:"maxTradeUsdc,omitempty"`
	BuyFeeBps            int      `json:"buyFeeBps"`
	SellFeeBps           int      `json:"sellFeeBps"`
	CreatorFeeShareBps   int      `json:"creatorFeeShareBps"`
	SeedPresets          []string `json:"seedPresets"`
	Source               string   `json:"source"`
}
