package controller

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/leap/backend/internal/service"
	"github.com/leap/backend/pkg/response"
)

func ListUserPositions(c *gin.Context) {
	account := strings.TrimSpace(c.Query("account"))
	if account == "" {
		response.MemeFail(c, 400, "account is required")
		return
	}

	positions, err := service.ListUserPositions(c.Request.Context(), account)
	if err != nil {
		failMarketError(c, err)
		return
	}
	response.MemeOK(c, positions)
}

func ListUserRewards(c *gin.Context) {
	account := strings.TrimSpace(c.Query("account"))
	feeVault := strings.TrimSpace(c.Query("feeVault"))
	if account == "" {
		response.MemeFail(c, 400, "account is required")
		return
	}
	if feeVault == "" {
		response.MemeFail(c, 400, "feeVault is required")
		return
	}

	rewards, err := service.ListUserRewards(account, feeVault)
	if err != nil {
		failMarketError(c, err)
		return
	}
	response.MemeOK(c, rewards)
}
