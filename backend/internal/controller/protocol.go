package controller

import (
	"github.com/gin-gonic/gin"
	"github.com/leap/backend/internal/service"
	"github.com/leap/backend/pkg/response"
)

func GetProtocolConfig(c *gin.Context) {
	response.MemeOK(c, service.GetProtocolConfig())
}
