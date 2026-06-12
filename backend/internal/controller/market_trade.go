package controller

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/leap/backend/internal/service"
	"github.com/leap/backend/pkg/response"
)

func ListLatestTrades(c *gin.Context) {
	trades, err := service.ListLatestTrades()
	if err != nil {
		failMarketError(c, err)
		return
	}
	response.MemeOK(c, trades)
}

func ListTokenTrades(c *gin.Context) {
	address := strings.TrimSpace(c.Query("address"))
	if address == "" {
		response.MemeFail(c, 400, "address is required")
		return
	}
	trades, err := service.ListTokenTrades(address)
	if err != nil {
		failMarketError(c, err)
		return
	}
	response.MemeOK(c, trades)
}
