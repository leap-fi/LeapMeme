package common

const (
	Version    = "v0.1.0"
	SystemName = "LEAP"
)

const (
	RequestIdKey = "X-Request-Id"
	UserIdKey    = "user_id"
	UsernameKey  = "username"
	RoleKey      = "role"
)

const (
	RoleGuestUser  = 0
	RoleCommonUser = 1
	RoleAdminUser  = 10
	RoleRootUser   = 100
)

// UserStatus 用户状态，表示用户是否被禁用
const (
	UserStatusEnabled  = 1
	UserStatusDisabled = 2
)

func IsValidRole(role int) bool {
	return role == RoleGuestUser || role == RoleCommonUser || role == RoleAdminUser || role == RoleRootUser
}

func IsAdminRole(role int) bool {
	return role >= RoleAdminUser
}
