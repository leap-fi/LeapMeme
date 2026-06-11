package setting

import "github.com/leap/backend/setting/config"

type AppConfig struct {
	SiteName       string `json:"site_name"`
	EnableRegister bool   `json:"enable_register"`
	Maintenance    bool   `json:"maintenance"`
}

type SecurityConfig struct {
	PasswordMinLength int `json:"password_min_length"`
}

var (
	App      = &AppConfig{SiteName: "Go API Skeleton", EnableRegister: true}
	Security = &SecurityConfig{PasswordMinLength: 8}
)

// 注册配置，将 App 和 Security 配置注册到 config.GlobalConfig 中，后续热更新时，会从数据库中读取配置，更新到 config.GlobalConfig 中
func RegisterConfigs() {
	config.GlobalConfig.Register("app", App)
	config.GlobalConfig.Register("security", Security)
}

// 从选项映射中加载配置，将选项映射中的配置加载到 config.GlobalConfig 中
func LoadFromOptionMap(options map[string]string) {
	_ = config.GlobalConfig.LoadFromDB(options)
}
