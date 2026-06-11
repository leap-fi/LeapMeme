package controller

import (
	"github.com/gin-gonic/gin"
	"github.com/leap/backend/internal/service"
	"github.com/leap/backend/pkg/response"
)

func ListLatestTrades(c *gin.Context) {
	trades, err := service.ListLatestTrades()
	if err != nil {
		failServiceError(c, err)
		return
	}
	response.MemeOK(c, trades)
}
