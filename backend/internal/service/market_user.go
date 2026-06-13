package service

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/leap/backend/internal/dto"
	"github.com/leap/backend/internal/indexer"
	"github.com/leap/backend/internal/model"
)

func ListUserPositions(ctx context.Context, account string) ([]dto.UserPositionResponse, error) {
	account = strings.TrimSpace(account)
	if account == "" {
		return []dto.UserPositionResponse{}, nil
	}

	tokenAddresses, err := collectUserPositionTokens(account)
	if err != nil {
		return nil, err
	}
	if len(tokenAddresses) == 0 {
		return []dto.UserPositionResponse{}, nil
	}

	return buildPositionResponses(ctx, account, tokenAddresses, nil)
}

func ListTokenPositions(ctx context.Context, tokenAddress string) ([]dto.UserPositionResponse, error) {
	tokenAddress = strings.TrimSpace(tokenAddress)
	if tokenAddress == "" {
		return []dto.UserPositionResponse{}, nil
	}

	token, err := model.GetTokenByAddress(tokenAddress)
	if err != nil {
		return nil, err
	}
	if token == nil {
		return []dto.UserPositionResponse{}, nil
	}

	accounts, err := model.GetDistinctAccountsByToken(tokenAddress, model.TokenPositionCandidates)
	if err != nil {
		return nil, err
	}
	if len(accounts) == 0 {
		return []dto.UserPositionResponse{}, nil
	}

	return buildPositionResponses(ctx, "", []string{token.Address}, accounts)
}

func ListUserRewards(account, feeVault string) ([]dto.UserRewardResponse, error) {
	account = strings.TrimSpace(account)
	feeVault = strings.TrimSpace(feeVault)
	if account == "" || feeVault == "" {
		return []dto.UserRewardResponse{}, nil
	}

	tokens, err := model.GetTokensByCreator(account)
	if err != nil {
		return nil, err
	}
	if len(tokens) == 0 {
		return []dto.UserRewardResponse{}, nil
	}

	statsByToken, err := model.GetCreatorRewardStatsByCreator(account)
	if err != nil {
		return nil, err
	}

	out := make([]dto.UserRewardResponse, 0)
	for _, token := range tokens {
		stats, ok := statsByToken[strings.ToLower(token.Address)]
		if !ok || stats.CreatorFeeAccrued <= 0 {
			continue
		}
		item := dto.UserRewardResponse{
			Address: token.Address,
			Symbol:  token.Symbol,
			Name:    token.Name,
		}
		if token.ID > 0 {
			id := token.ID
			item.TokenID = &id
		}
		if token.Logo != "" {
			logo := token.Logo
			item.Logo = &logo
		}
		vol24h := formatVolume(stats.Volume24h)
		item.TradeVolume24h = &vol24h
		accrued := formatVolume(stats.CreatorFeeAccrued)
		item.AccruedAmount = &accrued
		out = append(out, item)
	}
	return out, nil
}

func collectUserPositionTokens(account string) ([]string, error) {
	seen := make(map[string]struct{})
	addresses := make([]string, 0)

	fromTrades, err := model.GetDistinctTokensByAccount(account, model.UserPositionCandidates)
	if err != nil {
		return nil, err
	}
	for _, addr := range fromTrades {
		key := strings.ToLower(strings.TrimSpace(addr))
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		addresses = append(addresses, addr)
	}

	created, err := model.GetTokensByCreator(account)
	if err != nil {
		return nil, err
	}
	for _, token := range created {
		key := strings.ToLower(strings.TrimSpace(token.Address))
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		addresses = append(addresses, token.Address)
	}
	return addresses, nil
}

type positionCandidate struct {
	Account    string
	Token      model.Token
	HoldAmount string
}

func buildPositionResponses(
	ctx context.Context,
	viewerAccount string,
	tokenAddresses []string,
	holderAccounts []string,
) ([]dto.UserPositionResponse, error) {
	cfg := indexer.LoadConfig()

	tokensByAddress := make(map[string]model.Token)
	for _, addr := range tokenAddresses {
		token, err := model.GetTokenByAddress(addr)
		if err != nil {
			return nil, err
		}
		if token == nil {
			continue
		}
		tokensByAddress[strings.ToLower(token.Address)] = *token
	}
	if len(tokensByAddress) == 0 {
		return []dto.UserPositionResponse{}, nil
	}

	statsByToken, err := model.GetTradeVolumeStatsByTokens(tokenAddresses)
	if err != nil {
		return nil, err
	}

	candidates := make([]positionCandidate, 0)
	if viewerAccount != "" {
		for _, token := range tokensByAddress {
			amount := ""
			if strings.TrimSpace(cfg.RPCURL) != "" {
				balances, err := indexer.ReadTokenBalances(ctx, cfg, token.Address, []string{viewerAccount})
				if err != nil {
					return nil, err
				}
				amount = balances[strings.ToLower(viewerAccount)]
			}
			if model.ParseDecimalString(amount) <= 0 {
				netHold, err := model.GetNetHoldByAccountToken(viewerAccount, token.Address)
				if err != nil {
					return nil, err
				}
				amount = netHold
			}
			if model.ParseDecimalString(amount) <= 0 {
				continue
			}
			candidates = append(candidates, positionCandidate{
				Account:    viewerAccount,
				Token:      token,
				HoldAmount: amount,
			})
		}
	} else {
		for _, token := range tokensByAddress {
			balances := make(map[string]string)
			if strings.TrimSpace(cfg.RPCURL) != "" {
				var err error
				balances, err = indexer.ReadTokenBalances(ctx, cfg, token.Address, holderAccounts)
				if err != nil {
					return nil, err
				}
			}
			if len(balances) == 0 {
				netHolds, err := model.GetNetHoldsByToken(
					token.Address,
					holderAccounts,
					model.TokenPositionsLimit,
				)
				if err != nil {
					return nil, err
				}
				balances = netHolds
			}
			for account, amount := range balances {
				if model.ParseDecimalString(amount) <= 0 {
					continue
				}
				candidates = append(candidates, positionCandidate{
					Account:    account,
					Token:      token,
					HoldAmount: amount,
				})
			}
		}
	}

	sort.Slice(candidates, func(i, j int) bool {
		return model.ParseDecimalString(candidates[i].HoldAmount) > model.ParseDecimalString(candidates[j].HoldAmount)
	})
	if viewerAccount == "" && len(candidates) > model.TokenPositionsLimit {
		candidates = candidates[:model.TokenPositionsLimit]
	}

	out := make([]dto.UserPositionResponse, 0, len(candidates))
	for _, item := range candidates {
		stats := statsByToken[strings.ToLower(item.Token.Address)]
		out = append(out, toUserPositionResponse(item, stats))
	}
	return out, nil
}

func toUserPositionResponse(item positionCandidate, stats model.TokenVolumeStats) dto.UserPositionResponse {
	token := item.Token
	tokenID := token.ID
	decimals := "18"

	resp := dto.UserPositionResponse{
		ID:          fmt.Sprintf("%d_%s", tokenID, strings.ToLower(item.Account)),
		TokenID:     &tokenID,
		Address:     token.Address,
		Symbol:      token.Symbol,
		Name:        token.Name,
		Account:     item.Account,
		HoldAmount:  item.HoldAmount,
		TotalProfit: "0",
		Decimals:    &decimals,
	}

	if token.Logo != "" {
		logo := token.Logo
		resp.Logo = &logo
	}
	if token.LastPrice != "" {
		price := token.LastPrice
		resp.Price = &price
	}
	if stats.PriceChange24h != 0 {
		pc := formatVolume(stats.PriceChange24h)
		resp.PriceChangePercent24h = &pc
		resp.ChangePercent24h = &pc
	}

	return resp
}
