package model

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// 运行初始化 目录下读取 SQL 文件，执行迁移
// RunMigrations() 里只有「升级」，没有「回滚」。 这是常见做法，不是漏写
// 回滚逻辑在 .down.sql + migrate CLI，不在应用启动路径里：
// 需要回滚时，用 migrate 命令行（需先安装 migrate CLI）
/*
	# 回退 1 个版本
	migrate -path ../database/migrations -database "mysql://root:password@tcp(127.0.0.1:3306)/leap_backend?multiStatements=true" down 1

	# 回退到指定版本
	migrate ... goto 0
*/
func migrationsSource() string {
	if p := strings.TrimSpace(os.Getenv("MIGRATIONS_PATH")); p != "" {
		if strings.HasPrefix(p, "file://") {
			return p
		}
		return "file://" + p
	}
	return "file://../database/migrations"
}

func RunMigrations() error {
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		return fmt.Errorf("MYSQL_DSN is required for migrations")
	}

	migrateDSN := toMigrateDSN(dsn)
	m, err := migrate.New(migrationsSource(), migrateDSN)
	if err != nil {
		return fmt.Errorf("create migrator: %w", err)
	}
	defer m.Close()

	// 执行还没跑过的 .up.sql（升级）
	// ErrNoChange 已全部是最新版本 → 不算错误，直接忽略
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("migrate up: %w", err)
	}
	return nil
}

func toMigrateDSN(dsn string) string {
	dsn = strings.TrimSpace(dsn)
	if strings.HasPrefix(dsn, "mysql://") {
		return dsn
	}
	if idx := strings.Index(dsn, "?"); idx >= 0 {
		base := dsn[:idx]
		params := dsn[idx+1:]
		if !strings.Contains(params, "multiStatements") {
			params += "&multiStatements=true"
		}
		return "mysql://" + base + "?" + params
	}
	return "mysql://" + dsn + "?multiStatements=true"
}
