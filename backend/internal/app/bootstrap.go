package app

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/job"
	"github.com/leap/backend/internal/model"
	"github.com/leap/backend/logger"
	"github.com/leap/backend/setting"
)

func InitResources() error {
	_ = godotenv.Load()
	common.InitEnv()
	common.InitLogger()
	logger.SetupLogger()
	setting.RegisterConfigs()

	// 初始化 MySQL 数据库
	if err := model.InitDB(); err != nil {
		return fmt.Errorf("init db: %w", err)
	}
	common.SysLog("MySQL connected")

	// 初始化 Redis 客户端
	if err := common.InitRedisClient(); err != nil {
		return fmt.Errorf("init redis: %w", err)
	}

	if err := model.InitOptionMap(); err != nil {
		return fmt.Errorf("init options: %w", err)
	}
	setting.LoadFromOptionMap(common.OptionMap)
	setting.App.EnableRegister = common.EnableRegister

	if model.IsInitialized() || model.RootUserExists() {
		common.SysLog("system initialized")
	} else {
		common.SysLog("system not initialized — call POST /api/v1/setup/init")
	}

	// 注册默认定时任务，在 bootstrap 里注册了两个：sync_options、heartbeat
	job.RegisterDefaultJobs()
	return nil
}

func Port() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = fmt.Sprintf("%d", *common.Port)
	}
	return port
}
