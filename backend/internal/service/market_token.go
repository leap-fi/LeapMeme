package service

import (
	"strconv"
	"strings"

	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/dto"
	"github.com/leap/backend/internal/model"
)

func ListUserCreatedTokens(account string) ([]dto.TokenNewResponse, error) {
	tokens, err := model.GetTokensByCreator(account)
	if err != nil {
		return nil, err
	}
	if len(tokens) == 0 {
		return []dto.TokenNewResponse{}, nil
	}

	addresses := make([]string, 0, len(tokens))
	for _, t := range tokens {
		addresses = append(addresses, t.Address)
	}

	stats, err := model.GetTradeVolumeStatsByTokens(addresses)
	if err != nil {
		return nil, err
	}

	out := make([]dto.TokenNewResponse, 0, len(tokens))
	for _, token := range tokens {
		out = append(out, toTokenNewResponse(token, stats[strings.ToLower(token.Address)]))
	}
	return out, nil
}

func toTokenNewResponse(token model.Token, stats model.TokenVolumeStats) dto.TokenNewResponse {
	resp := dto.TokenNewResponse{
		Address: token.Address,
		Symbol:  token.Symbol,
		Name:    token.Name,
	}

	if token.Creator != "" {
		creator := token.Creator
		resp.Creator = &creator
	}
	if token.TxHash != "" {
		hash := token.TxHash
		resp.Hash = &hash
	}
	if token.BlockNumber > 0 {
		block := int64(token.BlockNumber)
		resp.BlockNumber = &block
	}
	if token.CreatedAt > 0 {
		ts := token.CreatedAt
		resp.Timestamp = &ts
	}
	if token.Status != "" {
		status := token.Status
		resp.Status = &status
	}
	if token.LtAddress != "" {
		lt := token.LtAddress
		resp.TargetAsset = &lt
	}

	decimals := 18
	resp.Decimals = &decimals

	source := "zap"
	resp.Source = &source
	if common.ZapAddress != "" {
		zap := common.ZapAddress
		resp.Zap = &zap
	}

	if stats.TradeCount > 0 || stats.TotalVolume > 0 {
		total := formatVolume(stats.TotalVolume)
		resp.TradeVolume = &total
		count := int(stats.TradeCount)
		resp.TradeCount = &count
	}
	if stats.Volume24h > 0 || stats.TradeCount24h > 0 {
		vol24h := formatVolume(stats.Volume24h)
		resp.TradeVolume24h = &vol24h
		count24h := int(stats.TradeCount24h)
		resp.TradeCount24h = &count24h
	}

	return resp
}

func formatVolume(v float64) string {
	if v == 0 {
		return "0"
	}
	return strconv.FormatFloat(v, 'f', -1, 64)
}
