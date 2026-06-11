package service

import (
	"github.com/leap/backend/internal/dto"
	"github.com/leap/backend/internal/model"
)

func ListLatestTrades() ([]dto.TradeLatestResponse, error) {
	trades, err := model.GetLatestTrades()
	if err != nil {
		return nil, err
	}
	out := make([]dto.TradeLatestResponse, 0, len(trades))
	for _, trade := range trades {
		out = append(out, toTradeLatestResponse(trade))
	}
	return out, nil
}

func toTradeLatestResponse(trade model.Trade) dto.TradeLatestResponse {
	return dto.TradeLatestResponse{
		Hash:      trade.Hash,
		Symbol:    trade.Symbol,
		Name:      trade.Name,
		Address:   trade.Address,
		Account:   trade.Account,
		Side:      trade.Side,
		Amount:    trade.Amount,
		Volume:    trade.Volume,
		Price:     trade.Price,
		TradeTime: trade.TradeTime,
	}
}
