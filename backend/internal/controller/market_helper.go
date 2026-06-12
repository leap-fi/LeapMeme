package controller

import (
	"github.com/gin-gonic/gin"
	"github.com/leap/backend/pkg/apperror"
	"github.com/leap/backend/pkg/response"
)

func failMarketError(c *gin.Context, err error) {
	if ae, ok := err.(*apperror.AppError); ok {
		code := ae.Code
		if code == 0 {
			code = 1
		}
		response.MemeFail(c, code, ae.Message)
		return
	}
	response.MemeFail(c, 1, "internal error")
}
