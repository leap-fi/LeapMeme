package common

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

func GetRandomString(length int) string {
	if length <= 0 {
		return ""
	}
	b := make([]byte, (length+1)/2)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)[:length]
}

func GetTimeString() string {
	now := time.Now().UTC()
	return fmt.Sprintf("%s%d", now.Format("20060102150405"), now.UnixNano()%1e9)
}

func GetTimestamp() int64 {
	return time.Now().UnixMilli()
}

func GetPointer[T any](v T) *T {
	return &v
}
