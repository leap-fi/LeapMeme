package common

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/go-redis/redis/v8"
)

var RDB *redis.Client

// 初始化 Redis 客户端，将 Redis 连接字符串解析为 Redis 客户端
func InitRedisClient() error {
	if os.Getenv("REDIS_CONN_STRING") == "" {
		RedisEnabled = false
		SysLog("REDIS_CONN_STRING not set, Redis disabled (using in-memory cache)")
		return nil
	}
	SysLog("Redis enabled")
	opt, err := redis.ParseURL(os.Getenv("REDIS_CONN_STRING"))
	if err != nil {
		return fmt.Errorf("parse redis url: %w", err)
	}
	opt.PoolSize = GetEnvOrDefault("REDIS_POOL_SIZE", 10)
	RDB = redis.NewClient(opt)

	// 检查 Redis 连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err = RDB.Ping(ctx).Result(); err != nil {
		return fmt.Errorf("redis ping: %w", err)
	}
	// 设置 Redis 连接成功，内存缓存也开启
	RedisEnabled = true
	MemoryCacheEnabled = true
	return nil
}

func RedisSet(key string, value string, expiration time.Duration) error {
	ctx := context.Background()
	return RDB.Set(ctx, key, value, expiration).Err()
}

func RedisGet(key string) (string, error) {
	ctx := context.Background()
	return RDB.Get(ctx, key).Result()
}

func RedisDel(key string) error {
	ctx := context.Background()
	return RDB.Del(ctx, key).Err()
}
