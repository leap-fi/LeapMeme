package model

import "github.com/leap/backend/common"

type Option struct {
	Key   string `json:"key" gorm:"primaryKey;size:191"`
	Value string `json:"value" gorm:"type:text"`
}

// 初始化选项映射，将数据库中的选项映射到 common.OptionMap 中
func InitOptionMap() error {
	options, err := AllOptions()
	if err != nil {
		return err
	}
	common.OptionMapLock.Lock()
	defer common.OptionMapLock.Unlock()
	for k, v := range options {
		common.OptionMap[k] = v
	}
	return nil
}

// 拉 options 表到内存
func AllOptions() (map[string]string, error) {
	var rows []Option
	if err := DB.Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make(map[string]string, len(rows))
	for _, row := range rows {
		result[row.Key] = row.Value
	}
	return result, nil
}

func UpdateOption(key, value string) error {
	opt := Option{Key: key, Value: value}
	return DB.Save(&opt).Error
}

func GetOption(key string, defaultValue string) string {
	common.OptionMapLock.RLock()
	defer common.OptionMapLock.RUnlock()
	if v, ok := common.OptionMap[key]; ok {
		return v
	}
	return defaultValue
}
