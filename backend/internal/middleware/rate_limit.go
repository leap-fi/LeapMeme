package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/leap/backend/common"
)

var (
	inMemoryRateLimiter common.InMemoryRateLimiter
	timeFormat          = "2006-01-02T15:04:05.000Z"
	defNext             = func(c *gin.Context) { c.Next() }
)

// redisRateLimiter 使用 Redis 限流
func redisRateLimiter(c *gin.Context, maxRequestNum int, duration int64, mark string) {
	// 获取 Redis 客户端
	ctx := context.Background()
	// 构建 Redis 键，根据客户端IP和标记生成唯一键
	key := "rateLimit:" + mark + c.ClientIP()
	// 获取 Redis 客户端
	rdb := common.RDB
	// 获取列表长度
	listLength, err := rdb.LLen(ctx, key).Result()
	// 如果获取失败，则返回500错误，并终止请求
	if err != nil {
		c.Status(http.StatusInternalServerError)
		c.Abort()
		return
	}
	// 如果列表长度小于最大请求数，则添加当前时间到列表
	if listLength < int64(maxRequestNum) {
		// 添加当前时间到列表（记录这一次请求的发生时间）
		rdb.LPush(ctx, key, time.Now().Format(timeFormat))
		// 设置过期时间（给整个 key 设 Redis TTL（默认 20 分钟））
		// 这段时间内若没有新请求，key 会被 Redis 删掉，避免长期不用的 IP 占内存
		// 这个key再redis的存活时间是每次更新这个列表就更新一次
		rdb.Expire(ctx, key, common.RateLimitKeyExpirationDuration)
	} else {
		// 获取列表最后一个元素
		oldTimeStr, _ := rdb.LIndex(ctx, key, -1).Result()
		// 解析时间
		oldTime, _ := time.Parse(timeFormat, oldTimeStr)
		// 解析当前时间
		nowTime, _ := time.Parse(timeFormat, time.Now().Format(timeFormat))
		// 如果时间差小于持续时间，则返回429错误，并终止请求
		if int64(nowTime.Sub(oldTime).Seconds()) < duration {
			c.Status(http.StatusTooManyRequests)
			c.Abort()
			return
		}
		// 添加当前时间到列表
		rdb.LPush(ctx, key, time.Now().Format(timeFormat))
		// 修剪列表，只保留下标为 0~maxRequestNum-1 的元素
		rdb.LTrim(ctx, key, 0, int64(maxRequestNum-1))
		// 设置过期时间
		rdb.Expire(ctx, key, common.RateLimitKeyExpirationDuration)
	}
}

// rateLimitFactory 限流工厂函数
// 根据是否启用 Redis，返回不同的限流函数
// 如果启用 Redis，则返回 redisRateLimiter 函数
// 否则返回 inMemoryRateLimiter 函数
func rateLimitFactory(maxRequestNum int, duration int64, mark string) gin.HandlerFunc {
	if common.RedisEnabled {
		return func(c *gin.Context) {
			// 使用 Redis 限流
			redisRateLimiter(c, maxRequestNum, duration, mark)
		}
	}

	inMemoryRateLimiter.Init(common.RateLimitKeyExpirationDuration)
	return func(c *gin.Context) {
		// 使用内存限流
		key := mark + c.ClientIP()
		if !inMemoryRateLimiter.Request(key, maxRequestNum, duration) {
			c.Status(http.StatusTooManyRequests)
			c.Abort()
		}
	}
}

func GlobalAPIRateLimit() gin.HandlerFunc {
	if common.GlobalApiRateLimitEnable {
		// GA 是 Global API 的缩写
		return rateLimitFactory(common.GlobalApiRateLimitNum, common.GlobalApiRateLimitDuration, "GA")
	}
	return defNext
}

func CriticalRateLimit() gin.HandlerFunc {
	if common.CriticalRateLimitEnable {
		// CT 是 Critical Rate Limit 的缩写
		return rateLimitFactory(common.CriticalRateLimitNum, common.CriticalRateLimitDuration, "CT")
	}
	return defNext
}

func GlobalWebRateLimit() gin.HandlerFunc {
	if common.GlobalWebRateLimitEnable {
		// GW 是 Global Web 的缩写
		return rateLimitFactory(common.GlobalWebRateLimitNum, common.GlobalWebRateLimitDuration, "GW")
	}
	return defNext
}

// BodySizeLimit 限制请求体大小
func BodySizeLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxBytes {
			// 如果请求体大小大于最大大小，则返回413错误，并终止请求
			c.Status(http.StatusRequestEntityTooLarge)
			c.Abort()
			return
		}
		// 标准库推荐的惯用写法，生产代码里基本都这么写
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

// RateLimitInfo 速率限制信息（是本项目自定义Header）
// 速率限制在这里指：在固定时间窗口内，允许通过多少次 HTTP 请求；超了返回 429 Too Many Requests。
// 此函数不负责限流，只往响应头里写策略说明；真正限流在 GlobalAPIRateLimit / CriticalRateLimit
// 本项目是某个客户端 IP限流，但是逻辑不在这里，在：
//
//	api.Use(middleware.GlobalAPIRateLimit())
//	setup.Use(middleware.CriticalRateLimit())
func RateLimitInfo() gin.HandlerFunc {
	return func(c *gin.Context) {
		if common.GlobalApiRateLimitEnable {
			c.Header("X-RateLimit-Policy",
				fmt.Sprintf("global-api: %d requests per %d seconds per IP",
					common.GlobalApiRateLimitNum, common.GlobalApiRateLimitDuration))
		}
		c.Next()
	}
}
