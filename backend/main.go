package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/app"
	"github.com/leap/backend/internal/job"
	"github.com/leap/backend/internal/kline"
	"github.com/leap/backend/internal/model"
	"github.com/leap/backend/internal/router"
)

func main() {
	startTime := time.Now()

	if err := app.InitResources(); err != nil {
		common.FatalLog("failed to initialize:", err)
	}
	defer func() {
		_ = model.CloseDB()
	}()

	if os.Getenv("GIN_MODE") != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if common.EnableJobs {
		job.DefaultRegistry.Start(ctx)
	}

	kline.InitDefault()
	common.SysLog("kline engine started")

	server := gin.New()
	store := cookie.NewStore([]byte(common.SessionSecret))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	server.Use(sessions.Sessions("session", store))

	router.Setup(server)

	port := app.Port()
	addr := ":" + port
	common.LogStartupSuccess(startTime, port)

	httpServer := &http.Server{
		Addr:    addr,
		Handler: server,
	}

	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			common.FatalLog("server error:", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	common.SysLog("shutting down...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		common.SysError("http shutdown: " + err.Error())
	}
	if eng := kline.Default(); eng != nil {
		if err := eng.Shutdown(); err != nil {
			common.SysError("kline shutdown: " + err.Error())
		}
	}
	cancel()
}
