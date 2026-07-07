package controller

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/leap/backend/internal/dto"
	"github.com/leap/backend/internal/service"
	"github.com/leap/backend/pkg/response"
)

func ListNewTokens(c *gin.Context) {
	var query dto.NewTokensQuery
	_ = c.ShouldBindQuery(&query)

	tokens, err := service.ListNewTokens(query)
	if err != nil {
		failMarketError(c, err)
		return
	}
	response.MemeOK(c, tokens)
}

func ListTrendingTokens(c *gin.Context) {
	var query dto.TrendingTokensQuery
	_ = c.ShouldBindQuery(&query)

	tokens, err := service.ListTrendingTokens(query)
	if err != nil {
		failMarketError(c, err)
		return
	}
	response.MemeOK(c, tokens)
}

func GetTokenDetail(c *gin.Context) {
	address := strings.TrimSpace(c.Query("address"))
	if address == "" {
		response.MemeFail(c, 400, "address is required")
		return
	}

	detail, err := service.GetTokenDetailWithContext(c.Request.Context(), address)
	if err != nil {
		failMarketError(c, err)
		return
	}
	response.MemeOK(c, detail)
}

func ListTokenPositions(c *gin.Context) {
	address := strings.TrimSpace(c.Query("address"))
	if address == "" {
		response.MemeFail(c, 400, "address is required")
		return
	}

	positions, err := service.ListTokenPositions(c.Request.Context(), address)
	if err != nil {
		failMarketError(c, err)
		return
	}
	response.MemeOK(c, positions)
}

func ListAccountMarkets(c *gin.Context) {
	markets, err := service.ListAccountMarkets(c.Request.Context())
	if err != nil {
		failMarketError(c, err)
		return
	}
	response.MemeOK(c, markets)
}

func ListUserCreatedTokens(c *gin.Context) {
	account := strings.TrimSpace(c.Query("account"))
	if account == "" {
		response.MemeFail(c, 400, "account is required")
		return
	}
	tokens, err := service.ListUserCreatedTokens(account)
	if err != nil {
		failMarketError(c, err)
		return
	}
	response.MemeOK(c, tokens)
}
