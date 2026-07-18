package model

const ChainIndexerCursorName = "chain_indexer_hyperevm"

type IndexerCursor struct {
	Name          string `gorm:"primaryKey;size:64"`
	LastBlock     uint64 `gorm:"column:last_block"`
	LastBlockHash string `gorm:"column:last_block_hash;size:66"`
	UpdatedAt     int64  `gorm:"column:updated_at"`
}

func (IndexerCursor) TableName() string { return "indexer_cursors" }

func GetIndexerCursor(name string) (uint64, error) {
	state, err := GetIndexerCursorState(name)
	if err != nil {
		return 0, err
	}
	return state.LastBlock, nil
}

func SetIndexerCursor(name string, lastBlock uint64) error {
	return SetIndexerCursorState(name, lastBlock, "")
}
