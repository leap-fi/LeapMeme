package response

import (
	"net/http"
	"reflect"
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
		Data: memeDataOrEmpty(data),
	})
}

func MemeFail(c *gin.Context, businessCode int, msg string) {
	if businessCode == 0 {
		businessCode = 1
	}
	c.JSON(http.StatusOK, MemeBody{
		Code: businessCode,
		Msg:  msg,
		Ts:   time.Now().UnixMilli(),
		Data: nil,
	})
}

// memeDataOrEmpty ensures list endpoints serialize [] not null when empty.
func memeDataOrEmpty(data any) any {
	if data == nil {
		return []any{}
	}
	v := reflect.ValueOf(data)
	if v.Kind() == reflect.Slice && v.IsNil() {
		return reflect.MakeSlice(v.Type(), 0, 0).Interface()
	}
	return data
}
