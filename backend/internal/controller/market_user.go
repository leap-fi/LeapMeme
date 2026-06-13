package controller

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/leap/backend/internal/service"
	"github.com/leap/backend/pkg/response"
)

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
