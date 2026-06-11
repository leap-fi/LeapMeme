package service

import (
	"os"
	"testing"

	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/model"
)

func TestJWTAccessAndRefresh(t *testing.T) {
	common.CryptoSecret = "test-secret"
	common.JWTAccessExpireMinutes = 60
	common.JWTRefreshExpireHours = 168

	user := &model.User{
		Id:       1,
		Username: "tester",
		Role:     common.RoleCommonUser,
	}

	access, err := GenerateAccessToken(user)
	if err != nil {
		t.Fatal(err)
	}
	refresh, err := GenerateRefreshToken(user)
	if err != nil {
		t.Fatal(err)
	}

	accessClaims, err := ParseToken(access)
	if err != nil {
		t.Fatal(err)
	}
	if accessClaims.Type != "access" || accessClaims.UserId != 1 {
		t.Fatalf("unexpected access claims: %+v", accessClaims)
	}

	refreshClaims, err := ParseToken(refresh)
	if err != nil {
		t.Fatal(err)
	}
	if refreshClaims.Type != "refresh" {
		t.Fatalf("expected refresh type, got %s", refreshClaims.Type)
	}
}

func TestMain(m *testing.M) {
	common.CryptoSecret = "test-secret"
	os.Exit(m.Run())
}
