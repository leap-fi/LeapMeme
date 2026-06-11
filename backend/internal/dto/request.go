package dto

// 专门用来在层与层之间传数据的结构体，尤其是 HTTP API 的入参 / 出参，和数据库表结构、内部业务对象分开
// 不把 model 数据结构直接当 API 入参，避免客户端乱改字段、也不把 GORM 细节暴露给前端
// 为什么要单独一层 DTO
// 1. 安全：响应里用 UserResponse，可以不返回密码哈希；请求里不让用户直接设 role。
// 2. 解耦：表结构改了，API 可以保持不变（或只改映射）。
// 3. 校验：binding:"required,min=8" 写在 DTO 上，和 DB 约束分开。
// 4. 语义清晰：LoginRequest / LoginResponse 一看就知道是接口契约，不是表实体。
type PageResult struct {
	Items    any   `json:"items"`
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
}

type SetupInitRequest struct {
	Username    string `json:"username" binding:"required,min=3,max=64"`
	Password    string `json:"password" binding:"required,min=8,max=64"`
	DisplayName string `json:"display_name" binding:"max=64"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Username    string `json:"username" binding:"required,min=3,max=64"`
	Password    string `json:"password" binding:"required,min=8,max=64"`
	DisplayName string `json:"display_name" binding:"max=64"`
	Email       string `json:"email" binding:"omitempty,email,max=128"`
}

type UserResponse struct {
	Id          int    `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Email       string `json:"email"`
	Role        int    `json:"role"`
	Status      int    `json:"status"`
}

type LoginResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"access_token,omitempty"`
	RefreshToken string       `json:"refresh_token,omitempty"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type TokenResponse struct {
	AccessToken string `json:"access_token"`
}

type APITokenResponse struct {
	AccessToken string `json:"access_token"`
}

type OptionUpdateRequest struct {
	Key   string `json:"key" binding:"required"`
	Value string `json:"value" binding:"required"`
}
