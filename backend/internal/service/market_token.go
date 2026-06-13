package service

import (
	"strconv"
	"strings"

	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/dto"
	"github.com/leap/backend/internal/model"
	"github.com/leap/backend/pkg/apperror"
)

func GetTokenDetail(address string) (*dto.TokenDetailResponse, error) {
	address = strings.TrimSpace(address)
	if address == "" {
		return nil, apperror.Validation("address is required")
	}

	token, err := model.GetTokenByAddress(address)
	if err != nil {
		return nil, err
	}
	if token == nil {
		return nil, apperror.ErrNotFound
	}

	stats, err := model.GetTokenDetailStats(token.Address)
	if err != nil {
		return nil, err
	}

	return toTokenDetailResponse(*token, stats), nil
}

func toTokenDetailResponse(token model.Token, stats model.TokenDetailStats) *dto.TokenDetailResponse {
	resp := &dto.TokenDetailResponse{
		Address: token.Address,
		Symbol:  token.Symbol,
		Name:    token.Name,
	}

	decimals := "18"
	resp.Decimals = &decimals

	if token.Logo != "" {
		logo := token.Logo
		resp.Logo = &logo
	}
	if token.Creator != "" {
		creator := token.Creator
		resp.Creator = &creator
	}
	if token.Description != "" {
		desc := token.Description
		resp.Description = &desc
	}
	if token.Twitter != "" {
		tw := token.Twitter
		resp.Twitter = &tw
	}
	if token.Telegram != "" {
		tg := token.Telegram
		resp.Telegram = &tg
	}
	if token.Website != "" {
		web := token.Website
		resp.Website = &web
	}
	if token.TxHash != "" {
		hash := token.TxHash
		resp.Hash = &hash
	}
	if token.BlockNumber > 0 {
		block := strconv.FormatUint(token.BlockNumber, 10)
		resp.BlockNumber = &block
	}
	if token.CreatedAt > 0 {
		ts := strconv.FormatInt(token.CreatedAt, 10)
		resp.Timestamp = &ts
	}
	if token.LtAddress != "" {
		lt := token.LtAddress
		resp.LtAddress = &lt
	}
	if token.BondingAddress != "" {
		bonding := token.BondingAddress
		resp.Bonding = &bonding
	}
	if token.RouterAddress != "" {
		router := token.RouterAddress
		resp.Router = &router
	} else if common.RouterAddress != "" {
		router := common.RouterAddress
		resp.Router = &router
	}
	if common.ZapAddress != "" {
		zap := common.ZapAddress
		resp.Zap = &zap
	}
	if token.TargetAsset != "" {
		market := token.TargetAsset
		resp.Market = &market
	}
	if token.TargetLeverage != nil {
		lev := strconv.Itoa(*token.TargetLeverage)
		resp.Leverage = &lev
	}
	if token.IsLong != nil {
		dir := "LONG"
		if !*token.IsLong {
			dir = "SHORT"
		}
		resp.Direction = &dir
	}
	if token.TotalSupply != "" {
		supply := token.TotalSupply
		resp.TotalSupply = &supply
	}
	if token.LastPrice != "" {
		price := token.LastPrice
		resp.Price = &price
	}
	if token.MarketCap != "" {
		mcap := token.MarketCap
		resp.MarketCap = &mcap
	}
	if token.BondingCurveProgress != "" {
		progress := token.BondingCurveProgress
		resp.BondingCurveProgress = &progress
	}
	if token.BondingCurveVolume != "" {
		vol := token.BondingCurveVolume
		resp.BondingCurveVolumeUsd = &vol
		resp.BondingCurveVolume = &vol
		resp.BondingCurveVolumeUsdLegacy = &vol
	}
	if token.Status != "" {
		status := token.Status
		resp.Status = &status
	}

	isExternal := false
	resp.IsExternal = &isExternal

	if stats.TradeCount > 0 || stats.TotalVolume > 0 {
		total := formatVolume(stats.TotalVolume)
		resp.TradeVolume = &total
		count := strconv.FormatInt(stats.TradeCount, 10)
		resp.TradeCount = &count
	}
	if stats.Volume24h > 0 || stats.TradeCount24h > 0 {
		vol24h := formatVolume(stats.Volume24h)
		resp.TradeVolume24h = &vol24h
		count24h := strconv.FormatInt(stats.TradeCount24h, 10)
		resp.TradeCount24h = &count24h
	}
	if stats.BuyVolume24h > 0 {
		buy := formatVolume(stats.BuyVolume24h)
		resp.BuyVolume24h = &buy
	}
	if stats.SellVolume24h > 0 {
		sell := formatVolume(stats.SellVolume24h)
		resp.SellVolume24h = &sell
	}
	if stats.BuyCount24h > 0 {
		buyCount := strconv.FormatInt(stats.BuyCount24h, 10)
		resp.BuyCount24h = &buyCount
	}
	if stats.SellCount24h > 0 {
		sellCount := strconv.FormatInt(stats.SellCount24h, 10)
		resp.SellCount24h = &sellCount
	}
	if stats.TradeUserCount > 0 {
		users := strconv.FormatInt(stats.TradeUserCount, 10)
		resp.TradeUserCount = &users
	}
	if stats.PriceChange24h != 0 {
		pc := formatVolume(stats.PriceChange24h)
		resp.PriceChangePercent24h = &pc
	}

	return resp
}


func ListUserCreatedTokens(account string) ([]dto.TokenNewResponse, error) {
	tokens, err := model.GetTokensByCreator(account)
	if err != nil {
		return nil, err
	}
	return mapTokensToResponses(tokens)
}

func mapTokensToResponses(tokens []model.Token) ([]dto.TokenNewResponse, error) {
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

	if token.Logo != "" {
		logo := token.Logo
		resp.Logo = &logo
	}
	if token.Creator != "" {
		creator := token.Creator
		resp.Creator = &creator
	}
	if token.Description != "" {
		desc := token.Description
		resp.Description = &desc
	}
	if token.Twitter != "" {
		tw := token.Twitter
		resp.Twitter = &tw
	}
	if token.Telegram != "" {
		tg := token.Telegram
		resp.Telegram = &tg
	}
	if token.Website != "" {
		web := token.Website
		resp.Website = &web
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
	if token.TotalSupply != "" {
		supply := token.TotalSupply
		resp.TotalSupply = &supply
	}
	if token.MarketCap != "" {
		mcap := token.MarketCap
		resp.MarketCap = &mcap
	}
	if token.BondingCurveProgress != "" {
		progress := token.BondingCurveProgress
		resp.BondingCurveProgress = &progress
	}
	if token.GraduatedAt > 0 {
		gt := token.GraduatedAt
		resp.GraduatedTime = &gt
	}
	if token.TargetAsset != "" {
		asset := token.TargetAsset
		resp.TargetAsset = &asset
		resp.Underlying = &asset
		resp.Market = &asset
	}
	if token.TargetLeverage != nil {
		lev := *token.TargetLeverage
		resp.TargetLeverage = &lev
		resp.Leverage = &lev
	}
	if token.IsLong != nil {
		isLong := *token.IsLong
		resp.IsLong = &isLong
		dir := "LONG"
		if !isLong {
			dir = "SHORT"
		}
		resp.Direction = &dir
	}
	if token.BondingAddress != "" {
		bonding := token.BondingAddress
		resp.Bonding = &bonding
	}

	decimals := 18
	resp.Decimals = &decimals

	source := "zap"
	resp.Source = &source
	if common.ZapAddress != "" {
		zap := common.ZapAddress
		resp.Zap = &zap
	}
	if common.RouterAddress != "" {
		router := common.RouterAddress
		resp.Router = &router
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
	if stats.BuyVolume24h > 0 {
		buy := formatVolume(stats.BuyVolume24h)
		resp.BuyVolume24h = &buy
	}
	if stats.SellVolume24h > 0 {
		sell := formatVolume(stats.SellVolume24h)
		resp.SellVolume24h = &sell
	}
	if stats.BuyCount24h > 0 {
		buyCount := int(stats.BuyCount24h)
		resp.BuyCount24h = &buyCount
	}
	if stats.SellCount24h > 0 {
		sellCount := int(stats.SellCount24h)
		resp.SellCount24h = &sellCount
	}
	if stats.PriceChange24h != 0 {
		pc := formatVolume(stats.PriceChange24h)
		resp.PriceChangePercent24h = &pc
	}

	return resp
}

func formatVolume(v float64) string {
	if v == 0 {
		return "0"
	}
	return strconv.FormatFloat(v, 'f', -1, 64)
}
