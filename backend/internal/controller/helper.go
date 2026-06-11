package controller

import (
	"github.com/leap/backend/pkg/apperror"
	"github.com/leap/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

func failServiceError(c *gin.Context, err error) {
	if ae, ok := err.(*apperror.AppError); ok {
		response.Fail(c, ae)
		return
	}
	response.Fail(c, apperror.ErrInternal)
}
