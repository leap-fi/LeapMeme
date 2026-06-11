package model

type Trade struct {
	ID        int    `json:"id" gorm:"primaryKey"`
	Hash      string `json:"hash"`
	Symbol    string `json:"symbol"`
	Name      string `json:"name"`
	Address   string `json:"address"`
	Account   string `json:"account"`
	Side      string `json:"side"`
	Amount    string `json:"amount"`
	Volume    string `json:"volume"`
	Price     string `json:"price"`
	TradeTime int64  `json:"trade_time"`
}

func GetLatestTrades() ([]Trade, error) {
	var trades []Trade
	// if err := DB.Order("trade_time DESC").Limit(10).Find(&trades).Error; err != nil {
	// 	return nil, err
	// }
	// return trades, nil
	// mock 数据
	trades = []Trade{
		{
			ID:        1,
			Hash:      "0xf3e14c8c647cf5350c48ac0fd46727817ebd558e4225a72970792661835d1ef7",
			Symbol:    "SPCX",
			Name:      "SpaceX",
			Address:   "0x774573550c26C8D29A79b8506BA30995c9C00000",
			Account:   "0xd1532635573A5D28f7D992a41F510D18f527DE20",
			Side:      "SELL",
			Amount:    "8639844.826308817",
			Volume:    "135.826844",
			Price:     "0.000015720981884581",
			TradeTime: 1781173022000,
		},
		{
			ID:        2,
			Hash:      "0x5c873b70abac227b8fc77a39dba444efa7ba249b962e40739f0eb503f1e050b8",
			Symbol:    "SPCX",
			Name:      "SpaceX",
			Address:   "0x774573550c26C8D29A79b8506BA30995c9C00000",
			Account:   "0x5a442E8e51f58fd2d48C6E4cCD5144F709BB28D2",
			Side:      "SELL",
			Amount:    "10177594.96459012",
			Volume:    "170.753495",
			Price:     "0.000016777391475499",
			TradeTime: 1781187629000,
		},
		{
			ID:        3,
			Hash:      "0xadc314680166c22fbb48919ae6d2926c0f77243f8fabddc42cc37bdec6b7afd0",
			Symbol:    "Asteroid",
			Name:      "Asteroid",
			Address:   "0x2De1F08b587683Fc3a2d45979b602D545B200000",
			Account:   "0x5a442E8e51f58fd2d48C6E4cCD5144F709BB28D2",
			Side:      "SELL",
			Amount:    "4376674.890485702",
			Volume:    "249.379168",
			Price:     "0.000056979139241554",
			TradeTime: 1781183583000,
		},
		{
			ID:        4,
			Hash:      "0x15f6a0f7e825848c7ac1775544c6c7e133e10902a0314702c71351aa001315c2",
			Symbol:    "Pürr",
			Name:      "Pürr",
			Address:   "0x3275367939EDe67EB6BF061A6E87330848400000",
			Account:   "0xdB3D255d02CA7EE0E6C5a579A6822B108dD28498",
			Side:      "SELL",
			Amount:    "3805244.244576149",
			Volume:    "76.665254",
			Price:     "0.000020147262323377",
			TradeTime: 1781185245000,
		},
	}
	return trades, nil
}
