package response

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type MemeBody struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Ts   int64  `json:"ts"`
	Data any    `json:"data"`
}

func MemeOK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, MemeBody{
		Code: 0,
		Msg:  "success",
		Ts:   time.Now().UnixMilli(),
		Data: data,
	})
}
