package model

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

// IndexerCursorState is the full checkpoint used for reorg-aware scanning.
type IndexerCursorState struct {
	Name          string
	LastBlock     uint64
	LastBlockHash string
	UpdatedAt     int64
}

func GetIndexerCursorState(name string) (IndexerCursorState, error) {
	var cursor IndexerCursor
	err := DB.Where("name = ?", name).First(&cursor).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return IndexerCursorState{Name: name}, nil
	}
	if err != nil {
		return IndexerCursorState{}, err
	}
	return IndexerCursorState{
		Name:          cursor.Name,
		LastBlock:     cursor.LastBlock,
		LastBlockHash: cursor.LastBlockHash,
		UpdatedAt:     cursor.UpdatedAt,
	}, nil
}

func SetIndexerCursorState(name string, lastBlock uint64, lastBlockHash string) error {
	now := time.Now().UnixMilli()
	cursor := IndexerCursor{
		Name:          name,
		LastBlock:     lastBlock,
		LastBlockHash: strings.TrimSpace(lastBlockHash),
		UpdatedAt:     now,
	}
	return DB.Save(&cursor).Error
}

// RewindIndexerAfter deletes indexed data with block_number > keepBlock and
// rewinds the cursor to keepBlock. keepBlock itself is retained (fork parent).
func RewindIndexerAfter(chainID int64, cursorName string, keepBlock uint64, keepHash string) ([]string, error) {
	var affectedTokens []string
	err := DB.Transaction(func(tx *gorm.DB) error {
		var tokenAddrs []string
		if err := tx.Model(&Trade{}).
			Where("chain_id = ? AND block_number > ?", chainID, keepBlock).
			Distinct("token_address").
			Pluck("token_address", &tokenAddrs).Error; err != nil {
			return fmt.Errorf("list affected tokens: %w", err)
		}
		affectedTokens = tokenAddrs

		if err := tx.Where("chain_id = ? AND block_number > ?", chainID, keepBlock).
			Delete(&Trade{}).Error; err != nil {
			return fmt.Errorf("delete trades: %w", err)
		}
		if err := tx.Where("block_number > ?", keepBlock).
			Delete(&Token{}).Error; err != nil {
			return fmt.Errorf("delete tokens: %w", err)
		}
		if err := tx.Where("chain_id = ? AND block_number > ?", chainID, keepBlock).
			Delete(&IndexerBlock{}).Error; err != nil {
			return fmt.Errorf("delete indexer blocks: %w", err)
		}

		now := time.Now().UnixMilli()
		cursor := IndexerCursor{
			Name:          cursorName,
			LastBlock:     keepBlock,
			LastBlockHash: strings.TrimSpace(keepHash),
			UpdatedAt:     now,
		}
		if err := tx.Save(&cursor).Error; err != nil {
			return fmt.Errorf("rewind cursor: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return affectedTokens, nil
}
