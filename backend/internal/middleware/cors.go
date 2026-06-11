package middleware

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/leap/backend/common"
)

func CORS() gin.HandlerFunc {
	config := cors.DefaultConfig()
	origins := common.CORSOrigins
	// 如果 origins 只有一个，并且是 *，则允许所有源
	allowAll := len(origins) == 1 && origins[0] == "*"

	if allowAll {
		// 允许所有源
		config.AllowAllOrigins = true
		config.AllowCredentials = false
	} else {
		// 允许指定源
		config.AllowOrigins = origins
		config.AllowCredentials = true
	}

	// 允许所有方法
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"}
	// 允许所有头
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-Id"}
	// 返回 cors 中间件，怎么没有包一个函数并调用next()？？？？
	// 因为这里 cors.New 返回的是一个 gin.HandlerFunc，用于处理 CORS 请求，所以不需要再包一个函数并调用next()
	return cors.New(config)
}
