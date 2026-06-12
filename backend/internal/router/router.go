package router

import (
	"github.com/gin-gonic/gin"
	"github.com/leap/backend/internal/controller"
	"github.com/leap/backend/internal/middleware"
)

func Setup(engine *gin.Engine) {
	engine.Use(middleware.Prometheus())
	engine.Use(middleware.Recovery())
	engine.Use(middleware.RequestId())
	engine.Use(middleware.PoweredBy())
	engine.Use(middleware.CORS())
	engine.Use(middleware.AccessLogger())
	engine.Use(middleware.BodySizeLimit(10 << 20)) // 10MB
	engine.Use(middleware.RateLimitInfo())

	engine.GET("/health", controller.Health)
	engine.GET("/ready", controller.Ready)
	engine.GET("/metrics", middleware.MetricsHandler())

	api := engine.Group("/api/v1")
	api.Use(middleware.GlobalAPIRateLimit())

	registerSetupRoutes(api)
	registerPublicRoutes(api)

	// Web3 阶段暂不暴露 /auth、/admin 等需登录的路由；鉴权中间件与 service 保留供未来扩展。

	market := engine.Group("/market")
	registerMarketRoutes(market)
}

func registerSetupRoutes(api *gin.RouterGroup) {
	setup := api.Group("/setup")
	setup.Use(middleware.CriticalRateLimit())
	{
		setup.GET("/status", controller.SetupStatus)
		setup.POST("/init", middleware.SetupGuard(), controller.SetupInit)
	}
}

func registerPublicRoutes(api *gin.RouterGroup) {
	api.GET("/system/info", controller.SystemInfo)
}

func registerMarketRoutes(market *gin.RouterGroup) {
	market.GET("/trade/latest", controller.ListLatestTrades)
	market.GET("/token/trades", controller.ListTokenTrades)
}
