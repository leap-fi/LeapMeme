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
