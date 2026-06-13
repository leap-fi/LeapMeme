package controller

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/leap/backend/internal/dto"
	"github.com/leap/backend/internal/service"
	"github.com/leap/backend/pkg/response"
)

func ListKlines(c *gin.Context) {
	var query dto.KlineListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.MemeFail(c, 1001, "invalid argument")
		return
	}
	rows, err := service.ListKlines(query)
	if err != nil {
		failMarketError(c, err)
		return
	}
	response.MemeOK(c, rows)
}

func BackfillKlines(c *gin.Context) {
	var query dto.KlineBackfillQuery
	_ = c.ShouldBindQuery(&query)
	if strings.TrimSpace(query.Address) == "" && c.Query("address") != "" {
		query.Address = c.Query("address")
	}
	result, err := service.BackfillKlines(c.Request.Context(), query)
	if err != nil {
		failMarketError(c, err)
		return
	}
	response.MemeOK(c, result)
}
