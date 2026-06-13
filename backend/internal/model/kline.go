package model

import (
	"strings"
	"time"

	"gorm.io/gorm/clause"
)

type Kline struct {
	TokenAddress string `gorm:"column:token_address;primaryKey"`
	Period       string `gorm:"column:period;primaryKey"`
	BeginTime    int64  `gorm:"column:begin_time;primaryKey"`
	EndTime      int64  `gorm:"column:end_time"`
	OpenPrice    string `gorm:"column:open_price"`
	HighPrice    string `gorm:"column:high_price"`
	LowPrice     string `gorm:"column:low_price"`
	ClosePrice   string `gorm:"column:close_price"`
	Volume       string `gorm:"column:volume"`
	QuoteVolume  string `gorm:"column:quote_volume"`
	TradeCount   uint32 `gorm:"column:trade_count"`
	UpdatedAt    int64  `gorm:"column:updated_at"`
}

func (Kline) TableName() string { return "klines" }

func UpsertKlines(rows []Kline) error {
	if len(rows) == 0 {
		return nil
	}
	now := time.Now().UnixMilli()
	for i := range rows {
		if rows[i].UpdatedAt == 0 {
			rows[i].UpdatedAt = now
		}
		rows[i].TokenAddress = strings.ToLower(strings.TrimSpace(rows[i].TokenAddress))
	}
	return DB.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "token_address"},
			{Name: "period"},
			{Name: "begin_time"},
		},
		DoUpdates: clause.AssignmentColumns([]string{
			"end_time", "open_price", "high_price", "low_price", "close_price",
			"volume", "quote_volume", "trade_count", "updated_at",
		}),
	}).CreateInBatches(rows, 200).Error
}

func ListKlines(tokenAddress, period string, startSec, endSec int64) ([]Kline, error) {
	tokenAddress = strings.ToLower(strings.TrimSpace(tokenAddress))
	if tokenAddress == "" {
		return []Kline{}, nil
	}
	var rows []Kline
	q := DB.Where("token_address = ? AND period = ?", tokenAddress, period)
	if startSec > 0 {
		q = q.Where("begin_time >= ?", startSec)
	}
	if endSec > 0 {
		q = q.Where("begin_time <= ?", endSec)
	}
	if err := q.Order("begin_time ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func DeleteKlinesForToken(tokenAddress, period string) error {
	tokenAddress = strings.ToLower(strings.TrimSpace(tokenAddress))
	if tokenAddress == "" {
		return nil
	}
	q := DB.Where("token_address = ?", tokenAddress)
	if period != "" {
		q = q.Where("period = ?", period)
	}
	return q.Delete(&Kline{}).Error
}
