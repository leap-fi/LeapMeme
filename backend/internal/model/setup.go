package model

import (
	"time"

	"github.com/leap/backend/common"
	"gorm.io/gorm"
)

type Setup struct {
	Id            int    `json:"id" gorm:"primaryKey"`
	Version       string `json:"version" gorm:"size:32"`
	InitializedAt int64  `json:"initialized_at"`
}

func MarkInitializedTx(tx *gorm.DB) error {
	setup := Setup{
		Version:       common.Version,
		InitializedAt: time.Now().UnixMilli(),
	}
	return tx.Create(&setup).Error
}

func InitRootUser(username, password, displayName string) (*User, error) {
	hashed, err := common.Password2Hash(password)
	if err != nil {
		return nil, err
	}
	user := &User{
		Username:    username,
		Password:    hashed,
		DisplayName: displayName,
		Role:        common.RoleRootUser,
		Status:      common.UserStatusEnabled,
	}

	err = DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(user).Error; err != nil {
			return err
		}
		return MarkInitializedTx(tx)
	})
	if err != nil {
		return nil, err
	}
	user.Sanitize()
	return user, nil
}
