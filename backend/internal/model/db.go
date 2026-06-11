package model

import (
	"fmt"
	"os"
	"time"

	"github.com/leap/backend/common"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() error {
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		return fmt.Errorf("MYSQL_DSN is required")
	}

	if common.RunMigrations {
		if err := RunMigrations(); err != nil {
			return fmt.Errorf("run migrations: %w", err)
		}
	}

	logLevel := logger.Warn
	if common.DebugEnabled {
		logLevel = logger.Info
	}

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return fmt.Errorf("open mysql: %w", err)
	}

	// 设置数据库连接池
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	sqlDB.SetMaxIdleConns(10)           // 设置数据库连接池最大空闲连接数
	sqlDB.SetMaxOpenConns(100)          // 设置数据库连接池最大连接数
	sqlDB.SetConnMaxLifetime(time.Hour) // 设置数据库连接池连接最大生命周期

	DB = db

	if common.AutoMigrate {
		if err := autoMigrate(); err != nil {
			return err
		}
	}
	return nil
}

func autoMigrate() error {
	return DB.AutoMigrate(
		&User{},
		&Option{},
		&Setup{},
	)
}

func CloseDB() error {
	if DB == nil {
		return nil
	}
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// 检查是否已初始化
func IsInitialized() bool {
	var count int64
	DB.Model(&Setup{}).Count(&count)
	return count > 0
}

func RootUserExists() bool {
	var count int64
	DB.Model(&User{}).Where("role >= ?", common.RoleAdminUser).Count(&count)
	return count > 0
}

func Transaction(fn func(tx *gorm.DB) error) error {
	return DB.Transaction(fn)
}
