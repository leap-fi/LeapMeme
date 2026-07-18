package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// IndexerBlock stores a scanned block hash for reorg detection.
type IndexerBlock struct {
	ChainID     int64  `gorm:"column:chain_id;primaryKey"`
	BlockNumber uint64 `gorm:"column:block_number;primaryKey"`
	BlockHash   string `gorm:"column:block_hash;size:66"`
	ParentHash  string `gorm:"column:parent_hash;size:66"`
	CreatedAt   int64  `gorm:"column:created_at"`
}

func (IndexerBlock) TableName() string { return "indexer_blocks" }

func UpsertIndexerBlock(block *IndexerBlock) error {
	return UpsertIndexerBlockTx(DB, block)
}

func UpsertIndexerBlockTx(db *gorm.DB, block *IndexerBlock) error {
	if db == nil {
		db = DB
	}
	if block == nil {
		return errors.New("indexer block is nil")
	}
	if block.CreatedAt == 0 {
		block.CreatedAt = time.Now().UnixMilli()
	}
	return db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "chain_id"},
			{Name: "block_number"},
		},
		DoUpdates: clause.AssignmentColumns([]string{"block_hash", "parent_hash", "created_at"}),
	}).Create(block).Error
}

func GetIndexerBlock(chainID int64, blockNumber uint64) (*IndexerBlock, error) {
	var row IndexerBlock
	err := DB.Where("chain_id = ? AND block_number = ?", chainID, blockNumber).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func DeleteIndexerBlocksAfter(chainID int64, blockNumber uint64) error {
	return DB.Where("chain_id = ? AND block_number > ?", chainID, blockNumber).
		Delete(&IndexerBlock{}).Error
}
