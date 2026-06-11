package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/leap/backend/pkg/apperror"
)

type Body struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, Body{
		Success: true,
		Message: "ok",
		Data:    data,
	})
}

func Message(c *gin.Context, message string) {
	c.JSON(http.StatusOK, Body{
		Success: true,
		Message: message,
	})
}

func Fail(c *gin.Context, err *apperror.AppError) {
	status := err.HTTPStatus
	if status == 0 {
		status = http.StatusBadRequest
	}
	c.JSON(status, Body{
		Success: false,
		Message: err.Message,
	})
}

func FailMsg(c *gin.Context, status int, message string) {
	Fail(c, apperror.New(status, 0, message))
}
