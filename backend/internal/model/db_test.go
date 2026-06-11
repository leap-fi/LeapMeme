package model

import (
	"os"
	"testing"

	"github.com/leap/backend/common"
)

func TestRunMigrations(t *testing.T) {
	if os.Getenv("MYSQL_DSN") == "" {
		t.Skip("MYSQL_DSN not set, skipping integration test")
	}
	if err := RunMigrations(); err != nil {
		t.Fatal(err)
	}
}

func TestInitDB(t *testing.T) {
	if os.Getenv("MYSQL_DSN") == "" {
		t.Skip("MYSQL_DSN not set, skipping integration test")
	}

	common.RunMigrations = true
	common.AutoMigrate = false

	if err := InitDB(); err != nil {
		t.Fatal(err)
	}
	defer CloseDB()

	if DB == nil {
		t.Fatal("DB should not be nil")
	}
}
