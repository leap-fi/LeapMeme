package common

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	LogWriterMu  sync.RWMutex
	logLevel     = slog.LevelInfo
	OnLogWritten func() // 不是「定义了一个空函数」，而是声明了一个函数类型的变量，初始值是 nil
)

/*
这是一个可选回调（hook）：

	有人注册了回调 → 调用它
	没人注册（仍是 nil）→ 什么都不做，避免 nil 调用 panic
	这个函数在logger.go中被注册为回调，当有任何日志写入时，会调用这个函数，用于计数并实现日志轮转
*/
func notifyLogWritten() {
	if OnLogWritten != nil {
		OnLogWritten()
	}
}

func InitLogger() {
	level := GetEnvOrDefaultString("LOG_LEVEL", "info")
	switch level {
	case "debug":
		logLevel = slog.LevelDebug
	case "warn", "warning":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel})
	slog.SetDefault(slog.New(handler))
}

// 将 stdout/stderr 和 slog 输出重定向到文件
func EnableFileLogging(file *os.File, closePrevious *os.File) {
	out := io.MultiWriter(os.Stdout, file)
	errOut := io.MultiWriter(os.Stderr, file)
	LogWriterMu.Lock()
	gin.DefaultWriter = out
	gin.DefaultErrorWriter = errOut
	handler := slog.NewJSONHandler(out, &slog.HandlerOptions{Level: logLevel})
	slog.SetDefault(slog.New(handler))
	LogWriterMu.Unlock()
	if closePrevious != nil {
		_ = closePrevious.Close()
	}
}

func SysLog(s string) {
	t := time.Now()
	LogWriterMu.RLock()
	defer LogWriterMu.RUnlock()
	slog.Info(s, "time", t.Format("2006/01/02 - 15:04:05"))
	_, _ = fmt.Fprintf(gin.DefaultWriter, "[SYS] %v | %s\n", t.Format("2006/01/02 - 15:04:05"), s)
	notifyLogWritten()
}

func SysError(s string) {
	t := time.Now()
	LogWriterMu.RLock()
	defer LogWriterMu.RUnlock()
	// 我要用当前的 gin.DefaultErrorWriter 和 slog 写一条日志，请在我写完整条日志之前，不要有人去换 writer
	slog.Error(s, "time", t.Format("2006/01/02 - 15:04:05"))
	_, _ = fmt.Fprintf(gin.DefaultErrorWriter, "[SYS] %v | %s\n", t.Format("2006/01/02 - 15:04:05"), s)
	notifyLogWritten()
}

func FatalLog(v ...any) {
	t := time.Now()
	LogWriterMu.RLock()
	slog.Error("fatal", "time", t.Format("2006/01/02 - 15:04:05"), "detail", fmt.Sprint(v...))
	_, _ = fmt.Fprintf(gin.DefaultErrorWriter, "[FATAL] %v | %v\n", t.Format("2006/01/02 - 15:04:05"), v)
	LogWriterMu.RUnlock()
	os.Exit(1)
}

// 在服务器启动成功时，打印日志
func LogStartupSuccess(startTime time.Time, port string) {
	durationMs := time.Since(startTime).Milliseconds() // 计算服务器启动花费的时间
	LogWriterMu.RLock()
	defer LogWriterMu.RUnlock()
	slog.Info("server started",
		"name", SystemName,
		"version", Version,
		"port", port,
		"duration_ms", durationMs,
	)
	// 打印服务器启动成功日志到控制台
	fmt.Fprintf(gin.DefaultWriter, "\n  \033[32m%s %s\033[0m  ready in %d ms\n\n", SystemName, Version, durationMs)
	fmt.Fprintf(gin.DefaultWriter, "  ➜  Local:   http://localhost:%s/\n\n", port)
	notifyLogWritten()
}
