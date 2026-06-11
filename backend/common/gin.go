package common

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetContextUserId(c *gin.Context) int {
	if v, ok := c.Get(UserIdKey); ok {
		switch id := v.(type) {
		case int:
			return id
		case int64:
			return int(id)
		case float64:
			return int(id)
		case string:
			n, _ := strconv.Atoi(id)
			return n
		}
	}
	return 0
}

func GetContextRole(c *gin.Context) int {
	if v, ok := c.Get(RoleKey); ok {
		switch role := v.(type) {
		case int:
			return role
		case int64:
			return int(role)
		}
	}
	return RoleGuestUser
}

func GetRequestId(c *gin.Context) string {
	if v, ok := c.Get(RequestIdKey); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
