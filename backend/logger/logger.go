package logger

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/leap/backend/common"
)

const maxLogCount = 1_000_000

var (
	setupLogLock    sync.Mutex
	setupLogWorking bool
	logCount        int
	currentLogFile  *os.File
)

// 日志轮转 和 初始化日志文件 公用这个函数
func SetupLogger() {
	defer func() {
		setupLogWorking = false
	}()

	// go run . 时，LogDir 为空，但是后面 common.InitEnv() 会设置时LogDir为 ./logs
	if *common.LogDir == "" {
		return
	}
	// 尝试获取日志锁，锁被占用时 立刻返回 false，拿到锁返回 true，不会一直等待
	ok := setupLogLock.TryLock()
	if !ok {
		return
	}

	//不能放到ok上面，因为如果ok为false，就不会执行到这里
	// TryLock 失败时你根本没拿到锁，但 defer Unlock() 已经注册了。函数 return 时仍会执行 Unlock()，对未锁定的 Mutex 解锁 → panic
	defer setupLogLock.Unlock()

	// 7   5   5
	// │   │   │
	// │   │   └── 其他人(other)：读+执行 (5 = 4+1)
	// │   └────── 同组(group)：读+执行 (5)
	// └────────── 所有者(owner)：读+写+执行 (7 = 4+2+1)
	// 前面的 0 是八进制前缀（Go 里写 0755 而不是 755）
	if err := os.MkdirAll(*common.LogDir, 0755); err != nil {
		log.Println("failed to create log dir:", err)
		return
	}
	// 20060102150405 不是魔法数字，而是 Go 的「年月日时分秒」占位符连写
	logPath := filepath.Join(*common.LogDir, fmt.Sprintf("app-%s.log", time.Now().Format("20060102150405")))
	/*
		等价于分步写：
			dir := *common.LogDir                                    // 例如 "./logs"
			fileName := fmt.Sprintf("oneapi-%s.log", time.Now().Format("20060102150405"))
			// fileName → "oneapi-20260521170530.log"
			logPath := filepath.Join(dir, fileName)
			// logPath → "logs/oneapi-20260521170530.log"（Windows 上可能是 logs\...）
	*/

	fd, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Println("failed to open log file:", err)
		return
	}

	oldFile := currentLogFile
	currentLogFile = fd
	common.EnableFileLogging(fd, oldFile) // 日志轮转 + 初始化日志文件

	common.SysLog("file logging enabled: " + logPath)
}

// 日志轮转
func maybeRotate() {
	if *common.LogDir == "" {
		return
	}
	logCount++
	if logCount <= maxLogCount || setupLogWorking {
		return
	}
	logCount = 0
	setupLogWorking = true
	go SetupLogger()
}

func init() {
	common.OnLogWritten = maybeRotate
}
