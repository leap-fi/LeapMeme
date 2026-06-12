package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

const ChainIndexerCursorName = "chain_indexer_hyperevm"

type IndexerCursor struct {
	Name      string `gorm:"primaryKey;size:64"`
	LastBlock uint64 `gorm:"column:last_block"`
	UpdatedAt int64  `gorm:"column:updated_at"`
}

func (IndexerCursor) TableName() string { return "indexer_cursors" }

func GetIndexerCursor(name string) (uint64, error) {
	var cursor IndexerCursor
	// 相当于 select * from indexer_cursors where name = ? limit 1
	err := DB.Where("name = ?", name).First(&cursor).Error // 查询游标
	if errors.Is(err, gorm.ErrRecordNotFound) {            // 如果游标不存在，则返回0
		return 0, nil
	}
	if err != nil { // 如果查询失败，则返回错误
		return 0, err
	}
	return cursor.LastBlock, nil // 返回游标的最后一个区块号
}

func SetIndexerCursor(name string, lastBlock uint64) error {
	now := time.Now().UnixMilli()
	cursor := IndexerCursor{
		Name:      name,
		LastBlock: lastBlock,
		UpdatedAt: now,
	}
	return DB.Save(&cursor).Error
}
