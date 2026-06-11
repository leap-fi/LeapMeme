package middleware

import (
	"context"
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/service"
	"github.com/leap/backend/pkg/apperror"
	"github.com/leap/backend/pkg/response"
)

const RouteTagKey = "route_tag"

func RouteTag(tag string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(RouteTagKey, tag)
		c.Next()
	}
}

func RequestId() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := common.GetTimeString() + common.GetRandomString(8)
		c.Set(common.RequestIdKey, id)
		ctx := context.WithValue(c.Request.Context(), common.RequestIdKey, id)
		c.Request = c.Request.WithContext(ctx) // 设置请求上下文
		c.Header(common.RequestIdKey, id)      // 设置请求头
		c.Next()
	}
}

func PoweredBy() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-App-Version", common.Version)
		c.Next()
	}
}

func SetUserContext(c *gin.Context, userId int, username string, role int) {
	c.Set(common.UserIdKey, userId)
	c.Set(common.UsernameKey, username)
	c.Set(common.RoleKey, role)
}

func setSession(c *gin.Context, userId int, username string, role, status int) {
	session := sessions.Default(c)
	session.Set("id", userId)
	session.Set("username", username)
	session.Set("role", role)
	session.Set("status", status)
	_ = session.Save()
}

func clearSession(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	_ = session.Save()
}

// UserAuth requires login via session or Bearer JWT / API token.
func UserAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		if id := session.Get("id"); id != nil {
			c.Set(common.UserIdKey, id)
			c.Set(common.UsernameKey, session.Get("username"))
			c.Set(common.RoleKey, session.Get("role"))
			c.Next()
			return
		}
		user, err := service.GetUserFromBearer(c.GetHeader("Authorization"))
		if err != nil {
			response.Fail(c, apperror.ErrUnauthorized)
			c.Abort()
			return
		}
		SetUserContext(c, user.Id, user.Username, user.Role)
		c.Next()
	}
}

// OptionalAuth 可选认证，如果 token/session 存在，则附加用户信息
func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		// 先试着 Session，再试着 GetUserFromBearer；只有 err == nil 才 SetUserContext，失败也 不 Abort
		if id := session.Get("id"); id != nil {
			c.Set(common.UserIdKey, id)
			c.Set(common.UsernameKey, session.Get("username"))
			c.Set(common.RoleKey, session.Get("role"))
		} else if user, err := service.GetUserFromBearer(c.GetHeader("Authorization")); err == nil {
			SetUserContext(c, user.Id, user.Username, user.Role)
		}
		c.Next()
	}
}

func RequireRole(minRole int) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := common.GetContextRole(c)
		if role < minRole {
			response.Fail(c, apperror.ErrForbidden)
			c.Abort()
			return
		}
		c.Next()
	}
}

func SetupGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !modelIsInitialized() {
			c.Next()
			return
		}
		response.Fail(c, apperror.Conflict("system already initialized"))
		c.Abort()
	}
}

func SetupRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		if modelIsInitialized() {
			c.Next()
			return
		}
		response.Fail(c, apperror.New(http.StatusPreconditionRequired, 428, "system not initialized"))
		c.Abort()
	}
}

// helpers used by auth controller
func SaveUserSession(c *gin.Context, userId int, username string, role, status int) {
	setSession(c, userId, username, role, status)
}

func ClearUserSession(c *gin.Context) {
	clearSession(c)
}
