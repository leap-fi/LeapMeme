package model

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Token struct {
	ID          int64  `gorm:"primaryKey"`
	Address     string `gorm:"size:42;uniqueIndex"`
	Symbol      string `gorm:"size:64"`
	Name        string `gorm:"size:128"`
	Creator     string `gorm:"size:42"`
	LtAddress   string `gorm:"size:42;column:lt_address"`
	TxHash      string `gorm:"size:66;column:tx_hash"`
	BlockNumber uint64 `gorm:"column:block_number"`
	Status      string `gorm:"size:32"`
	CreatedAt   int64  `gorm:"column:created_at"`
}

func (Token) TableName() string { return "tokens" }

func UpsertToken(token *Token) error {
	if token == nil {
		return errors.New("token is nil")
	}
	if token.CreatedAt == 0 {
		token.CreatedAt = time.Now().UnixMilli()
	}
	if token.Status == "" {
		token.Status = "TRADING"
	}
	return DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "address"}},
		DoUpdates: clause.AssignmentColumns([]string{"symbol", "name", "creator", "lt_address", "status"}),
	}).Create(token).Error
}

func GetTokenByAddress(address string) (*Token, error) {
	var token Token
	err := DB.Where("address = ?", address).First(&token).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &token, nil
}

func GetTokensByCreator(creator string) ([]Token, error) {
	creator = strings.TrimSpace(creator)
	if creator == "" {
		return []Token{}, nil
	}
	var tokens []Token

	// SELECT * FROM tokens WHERE LOWER(creator) = LOWER('0x你的钱包地址') ORDER BY created_at DESC
	err := DB.Where("LOWER(creator) = LOWER(?)", creator).
		Order("created_at DESC").
		Find(&tokens).Error
	if err != nil {
		return nil, err
	}
	return tokens, nil
}
