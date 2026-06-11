package model

import (
	"errors"
	"strings"

	"github.com/leap/backend/common"
	"gorm.io/gorm"
)

type User struct {
	Id          int            `json:"id" gorm:"primaryKey"`
	Username    string         `json:"username" gorm:"uniqueIndex;size:64;not null"`
	Password    string         `json:"-" gorm:"not null"`
	DisplayName string         `json:"display_name" gorm:"size:64"`
	Email       string         `json:"email" gorm:"size:128;index"`
	Role        int            `json:"role" gorm:"default:1"`
	Status      int            `json:"status" gorm:"default:1"`
	AccessToken *string        `json:"access_token,omitempty" gorm:"size:64;uniqueIndex"`
	CreatedAt   int64          `json:"created_at" gorm:"autoCreateTime:milli"`
	UpdatedAt   int64          `json:"updated_at" gorm:"autoUpdateTime:milli"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

func (u *User) Sanitize() {
	u.Password = ""
}

func GetUserById(id int) (*User, error) {
	var user User
	err := DB.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	user.Sanitize()
	return &user, nil
}

func GetUserByUsername(username string) (*User, error) {
	var user User
	err := DB.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func GetUserByAccessToken(token string) (*User, error) {
	token = strings.TrimPrefix(strings.TrimSpace(token), "Bearer ")
	if token == "" {
		return nil, errors.New("empty token")
	}
	var user User
	err := DB.Where("access_token = ?", token).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func CreateUser(user *User) error {
	return DB.Create(user).Error
}

func UpdateUser(user *User) error {
	return DB.Save(user).Error
}

func ListUsers(page, pageSize int) ([]User, int64, error) {
	var users []User
	var total int64
	query := DB.Model(&User{})
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}
	err := query.Order("id desc").Offset(offset).Limit(pageSize).Find(&users).Error
	for i := range users {
		users[i].Sanitize()
	}
	return users, total, err
}

func DeleteUser(id int) error {
	return DB.Delete(&User{}, id).Error
}

func ValidateUser(username, password string) (*User, error) {
	if strings.TrimSpace(username) == "" || password == "" {
		return nil, errors.New("username or password empty")
	}
	user, err := GetUserByUsername(username)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}
	if user.Status != common.UserStatusEnabled {
		return nil, errors.New("account disabled")
	}
	if !common.ValidatePasswordAndHash(password, user.Password) {
		return nil, errors.New("invalid credentials")
	}
	return user, nil
}
