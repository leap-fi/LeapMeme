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
	return mapLatestTrades(trades), nil
}

func ListTokenTrades(tokenAddress string) ([]dto.TokenTradeResponse, error) {
	trades, err := model.GetTradesByTokenAddress(tokenAddress)
	if err != nil {
		return nil, err
	}
	out := make([]dto.TokenTradeResponse, 0, len(trades))
	for _, trade := range trades {
		out = append(out, toTokenTradeResponse(trade))
	}
	return out, nil
}

func mapLatestTrades(trades []model.Trade) []dto.TradeLatestResponse {
	out := make([]dto.TradeLatestResponse, 0, len(trades))
	for _, trade := range trades {
		out = append(out, toTradeLatestResponse(trade))
	}
	return out
}

func toTradeLatestResponse(trade model.Trade) dto.TradeLatestResponse {
	return dto.TradeLatestResponse{
		Hash:      trade.Hash,
		Symbol:    trade.Symbol,
		Name:      trade.Name,
		Address:   trade.TokenAddress,
		Account:   trade.Account,
		Side:      trade.Side,
		Amount:    trade.Amount,
		Volume:    trade.Volume,
		Price:     trade.Price,
		TradeTime: trade.TradeTime,
		Source:    trade.Source,
	}
}

func toTokenTradeResponse(trade model.Trade) dto.TokenTradeResponse {
	return dto.TokenTradeResponse{
		Hash:      trade.Hash,
		Address:   trade.TokenAddress,
		Account:   trade.Account,
		Side:      trade.Side,
		Amount:    trade.Amount,
		Volume:    trade.Volume,
		Price:     trade.Price,
		TradeTime: trade.TradeTime,
		Source:    trade.Source,
	}
}
