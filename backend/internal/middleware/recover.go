package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"github.com/leap/backend/common"
	"github.com/leap/backend/pkg/response"
)

// 恢复中间件，用于捕获panic并记录日志
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			// recover() 接住panic，没有则返回nil
			// 如果panic的值不为nil，则记录panic的值和堆栈信息
			// 然后返回500错误
			// 然后终止请求
			if err := recover(); err != nil {
				common.SysLog(fmt.Sprintf("panic: %v\n%s", err, debug.Stack()))
				response.FailMsg(c, http.StatusInternalServerError, "internal server error")
				c.Abort()
			}
		}()
		c.Next()
	}
}
