package dto

type KlineListQuery struct {
	Address   string `form:"address" binding:"required"`
	Period    string `form:"period" binding:"required"`
	StartTime int64  `form:"startTime" binding:"required"`
	EndTime   int64  `form:"endTime" binding:"required"`
}

type KlineResponse struct {
	BeginTime   int64   `json:"beginTime"`
	EndTime     int64   `json:"endTime"`
	OpenPrice   float64 `json:"openPrice"`
	HighPrice   float64 `json:"highPrice"`
	LowPrice    float64 `json:"lowPrice"`
	ClosePrice  float64 `json:"closePrice"`
	Volume      float64 `json:"volume"`
	QuoteVolume float64 `json:"quoteVolume"`
	Count       int64   `json:"count"`
}

type KlineBackfillQuery struct {
	Address     string `form:"address"`
	Replace     bool   `form:"replace"`
	BatchTrades int    `form:"batchTrades"`
}
