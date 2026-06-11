package middleware

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/leap/backend/common"
)

// AccessLogger 访问日志中间件，用于记录请求日志
func AccessLogger() gin.HandlerFunc {
	// gin.LoggerWithFormatter 返回一个 gin.HandlerFunc，用于记录请求日志
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		var requestID string
		if param.Keys != nil {
			requestID, _ = param.Keys[common.RequestIdKey].(string)
		}
		// 获取路由标签
		tag, _ := param.Keys[RouteTagKey].(string)
		if tag == "" {
			tag = "api"
		}
		// 自定义日志格式，用于记录请求日志
		return fmt.Sprintf("[GIN] %s | %s | %s | %3d | %13v | %15s | %7s %s\n",
			param.TimeStamp.Format("2006/01/02 - 15:04:05"), // 时间
			tag,              // 路由标签
			requestID,        // 请求ID
			param.StatusCode, // 状态码
			param.Latency,    // 延迟
			param.ClientIP,   // 客户端IP
			param.Method,     // 方法
			param.Path,       // 路径
		)
	})
}
