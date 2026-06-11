package service

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/model"
)

type JWTClaims struct {
	UserId   int    `json:"user_id"`
	Username string `json:"username"`
	Role     int    `json:"role"`
	Type     string `json:"type"`
	jwt.RegisteredClaims
}

func GenerateAccessToken(user *model.User) (string, error) {
	return signToken(user, "access", time.Duration(common.JWTAccessExpireMinutes)*time.Minute)
}

func GenerateRefreshToken(user *model.User) (string, error) {
	return signToken(user, "refresh", time.Duration(common.JWTRefreshExpireHours)*time.Hour)
}

func signToken(user *model.User, tokenType string, expire time.Duration) (string, error) {
	claims := JWTClaims{
		UserId:   user.Id,
		Username: user.Username,
		Role:     user.Role,
		Type:     tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expire)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ID:        uuid.NewString(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(common.CryptoSecret))
}

func ParseToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(common.CryptoSecret), nil
	})
	if err != nil {
		return nil, err
	}
	// .(*JWTClaims) 是类型断言
	// 意思是：这个接口里实际装的是 *JWTClaims，请转成这个具体类型
	// 解析后 token.Claims 在类型系统里仍是 接口 jwt.Claims，编译器不知道里面有 UserId、Role、Type 这些字段。要访问 claims.UserId，必须先断言成 *JWTClaims
	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func GenerateAPIAccessToken(user *model.User) (string, error) {
	token := uuid.NewString()
	user.AccessToken = &token
	if err := model.UpdateUser(user); err != nil {
		return "", err
	}
	return token, nil
}
