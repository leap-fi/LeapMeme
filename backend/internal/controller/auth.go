package controller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/dto"
	"github.com/leap/backend/internal/middleware"
	"github.com/leap/backend/internal/model"
	"github.com/leap/backend/internal/service"
	"github.com/leap/backend/pkg/apperror"
	"github.com/leap/backend/pkg/response"
)

func SetupStatus(c *gin.Context) {
	response.OK(c, gin.H{
		"initialized": model.IsInitialized() || model.RootUserExists(),
		"version":     common.Version,
	})
}

func SetupInit(c *gin.Context) {
	var req dto.SetupInitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, apperror.Validation(err.Error()))
		return
	}
	user, err := service.SetupInit(req)
	if err != nil {
		failServiceError(c, err)
		return
	}
	response.OK(c, user)
}

func Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, apperror.Validation(err.Error()))
		return
	}
	user, err := service.Register(req)
	if err != nil {
		failServiceError(c, err)
		return
	}
	response.OK(c, user)
}

func Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, apperror.Validation(err.Error()))
		return
	}
	result, err := service.Login(req)
	if err != nil {
		failServiceError(c, err)
		return
	}
	middleware.SaveUserSession(c, result.User.Id, result.User.Username, result.User.Role, common.UserStatusEnabled)
	response.OK(c, result)
}

func Logout(c *gin.Context) {
	middleware.ClearUserSession(c)
	response.Message(c, "logged out")
}

func Me(c *gin.Context) {
	userId := common.GetContextUserId(c)
	if userId == 0 {
		response.Fail(c, apperror.ErrUnauthorized)
		return
	}
	user, err := service.GetCurrentUser(userId)
	if err != nil {
		failServiceError(c, err)
		return
	}
	response.OK(c, user)
}

func RefreshToken(c *gin.Context) {
	var req dto.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, apperror.Validation(err.Error()))
		return
	}
	result, err := service.RefreshAccessToken(req.RefreshToken)
	if err != nil {
		failServiceError(c, err)
		return
	}
	response.OK(c, result)
}

func CreateAPIToken(c *gin.Context) {
	result, err := service.CreateAPIToken(common.GetContextUserId(c))
	if err != nil {
		failServiceError(c, err)
		return
	}
	response.OK(c, result)
}

func RevokeAPIToken(c *gin.Context) {
	if err := service.RevokeAPIToken(common.GetContextUserId(c)); err != nil {
		failServiceError(c, err)
		return
	}
	response.Message(c, "api token revoked")
}

func ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	result, err := service.ListUsers(page, pageSize)
	if err != nil {
		response.Fail(c, apperror.ErrInternal)
		return
	}
	response.OK(c, result)
}

func DeleteUser(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := service.DeleteUser(id, common.GetContextRole(c)); err != nil {
		if ae, ok := err.(*apperror.AppError); ok {
			response.Fail(c, ae)
			return
		}
		response.Fail(c, apperror.ErrInternal)
		return
	}
	response.Message(c, "deleted")
}

func Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func Ready(c *gin.Context) {
	if model.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not ready", "reason": "db"})
		return
	}
	sqlDB, err := model.DB.DB()
	if err != nil || sqlDB.Ping() != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not ready", "reason": "db ping"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

func SystemInfo(c *gin.Context) {
	response.OK(c, gin.H{
		"name":    common.SystemName,
		"version": common.Version,
		"redis":   common.RedisEnabled,
	})
}
