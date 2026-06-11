package common

import (
	"flag"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

var (
	// flag 是 Go 标准库 flag，用来解析启动程序时在命令行里传的参数（类似其他语言的 --port=8080）
	// 每次启动程序时，可以传入不同的参数，来控制程序的行为（只会影响这一次启动）
	// 比如：go run . --port=8080 --log-dir=./logs
	Port         = flag.Int("port", 8080, "server port")
	LogDir       = flag.String("log-dir", "", "log directory")
	DebugEnabled = false

	SessionSecret = uuid.New().String()
	CryptoSecret  = uuid.New().String()

	EnableRegister = true
	EnableJobs     = true
	SyncFrequency  = 60

	RunMigrations = true
	AutoMigrate   = false

	CORSOrigins = []string{"*"}

	RedisEnabled                   = false
	MemoryCacheEnabled             = false
	RateLimitKeyExpirationDuration = 20 * time.Minute

	GlobalApiRateLimitEnable         = true
	GlobalApiRateLimitNum            = 180
	GlobalApiRateLimitDuration int64 = 60
	GlobalWebRateLimitEnable         = false
	GlobalWebRateLimitNum            = 60
	GlobalWebRateLimitDuration int64 = 60
	CriticalRateLimitEnable          = true
	CriticalRateLimitNum             = 20
	CriticalRateLimitDuration  int64 = 60

	JWTAccessExpireMinutes = 60
	JWTRefreshExpireHours  = 168

	OptionMap     map[string]string
	OptionMapLock sync.RWMutex
)

func InitEnv() {
	flag.Parse() // 解析命令行参数

	// 这里的 debug 是 Gin 运行模式 + 项目调试开关，不是 IDE 的 Go debugger（断点调试）。断点调试与 GIN_MODE 无关，用 Delve / IDE 即可
	if os.Getenv("GIN_MODE") == "debug" {
		DebugEnabled = true
	}

	if v := os.Getenv("PORT"); v != "" {
		*Port = GetEnvOrDefault("PORT", *Port)
	}
	if v := strings.TrimSpace(os.Getenv("LOG_DIR")); v != "" {
		*LogDir = v
	}
	// 登录体系里的 Session 加密密钥 和 JWT 签名密钥
	SessionSecret = GetEnvOrDefaultString("SESSION_SECRET", SessionSecret)
	CryptoSecret = GetEnvOrDefaultString("JWT_SECRET", CryptoSecret)
	// 关闭注册后，管理员仍可通过后台创建用户；只是不能自助注册
	EnableRegister = GetEnvOrDefaultBool("ENABLE_REGISTER", EnableRegister)
	// 控制 是否启动后台定时任务
	// 在 bootstrap 里注册了两个：sync_options、heartbeat
	EnableJobs = GetEnvOrDefaultBool("ENABLE_JOBS", EnableJobs)
	SyncFrequency = GetEnvOrDefault("SYNC_FREQUENCY", SyncFrequency)

	// 这两项控制 数据库表结构如何同步，是两套不同机制，一般不要同时乱开
	// 推荐开启RunMigrations，关闭AutoMigrate
	RunMigrations = GetEnvOrDefaultBool("RUN_MIGRATIONS", RunMigrations)
	AutoMigrate = GetEnvOrDefaultBool("AUTO_MIGRATE", AutoMigrate)

	if origins := os.Getenv("CORS_ORIGINS"); origins != "" {
		parts := strings.Split(origins, ",")
		CORSOrigins = make([]string, 0, len(parts))
		for _, o := range parts {
			if trimmed := strings.TrimSpace(o); trimmed != "" {
				CORSOrigins = append(CORSOrigins, trimmed)
			}
		}
	}

	// 登录体系里的 JWT 过期时间
	JWTAccessExpireMinutes = GetEnvOrDefault("JWT_ACCESS_EXPIRE_MINUTES", JWTAccessExpireMinutes)
	JWTRefreshExpireHours = GetEnvOrDefault("JWT_REFRESH_EXPIRE_HOURS", JWTRefreshExpireHours)

	// 全局 API 限流
	GlobalApiRateLimitEnable = GetEnvOrDefaultBool("GLOBAL_API_RATE_LIMIT_ENABLE", GlobalApiRateLimitEnable)
	GlobalApiRateLimitNum = GetEnvOrDefault("GLOBAL_API_RATE_LIMIT", GlobalApiRateLimitNum)
	GlobalApiRateLimitDuration = int64(GetEnvOrDefault("GLOBAL_API_RATE_LIMIT_DURATION", int(GlobalApiRateLimitDuration)))

	// 全局 Web 限流
	// 全局 Web 限流是针对所有 Web 请求的限流，一般用于保护关键业务，如登录、注册、支付等
	GlobalWebRateLimitEnable = GetEnvOrDefaultBool("GLOBAL_WEB_RATE_LIMIT_ENABLE", GlobalWebRateLimitEnable)
	GlobalWebRateLimitNum = GetEnvOrDefault("GLOBAL_WEB_RATE_LIMIT", GlobalWebRateLimitNum)
	GlobalWebRateLimitDuration = int64(GetEnvOrDefault("GLOBAL_WEB_RATE_LIMIT_DURATION", int(GlobalWebRateLimitDuration)))

	// 紧急限流
	// 紧急限流是针对特定路由的限流，一般用于保护关键业务，如登录、注册、支付等
	CriticalRateLimitEnable = GetEnvOrDefaultBool("CRITICAL_RATE_LIMIT_ENABLE", CriticalRateLimitEnable)
	CriticalRateLimitNum = GetEnvOrDefault("CRITICAL_RATE_LIMIT", CriticalRateLimitNum)
	CriticalRateLimitDuration = int64(GetEnvOrDefault("CRITICAL_RATE_LIMIT_DURATION", int(CriticalRateLimitDuration)))

	OptionMap = make(map[string]string)
}
