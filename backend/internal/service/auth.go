package service

import (
	"strings"

	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/dto"
	"github.com/leap/backend/internal/model"
	"github.com/leap/backend/pkg/apperror"
	"github.com/leap/backend/setting"
)

func toUserResponse(user *model.User) dto.UserResponse {
	return dto.UserResponse{
		Id:          user.Id,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Email:       user.Email,
		Role:        user.Role,
		Status:      user.Status,
	}
}

func SetupInit(req dto.SetupInitRequest) (*dto.UserResponse, error) {
	if model.IsInitialized() || model.RootUserExists() {
		return nil, apperror.Conflict("system already initialized")
	}
	user, err := model.InitRootUser(req.Username, req.Password, req.DisplayName)
	if err != nil {
		return nil, apperror.New(500, 500, err.Error())
	}
	resp := toUserResponse(user)
	return &resp, nil
}

func Register(req dto.RegisterRequest) (*dto.UserResponse, error) {
	if !common.EnableRegister && !setting.App.EnableRegister {
		return nil, apperror.New(403, 403, "registration is disabled")
	}
	if !model.IsInitialized() && !model.RootUserExists() {
		return nil, apperror.New(400, 400, "please initialize system first via /api/v1/setup/init")
	}
	if len(req.Password) < setting.Security.PasswordMinLength {
		return nil, apperror.Validation("password too short")
	}
	if _, err := model.GetUserByUsername(req.Username); err == nil {
		return nil, apperror.Conflict("username already exists")
	}
	hashed, err := common.Password2Hash(req.Password)
	if err != nil {
		return nil, apperror.ErrInternal
	}
	user := &model.User{
		Username:    req.Username,
		Password:    hashed,
		DisplayName: req.DisplayName,
		Email:       req.Email,
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
	}
	if err := model.CreateUser(user); err != nil {
		return nil, apperror.ErrInternal
	}
	user.Sanitize()
	resp := toUserResponse(user)
	return &resp, nil
}

func Login(req dto.LoginRequest) (*dto.LoginResponse, error) {
	user, err := model.ValidateUser(req.Username, req.Password)
	if err != nil {
		return nil, apperror.New(401, 401, "invalid username or password")
	}
	access, err := GenerateAccessToken(user)
	if err != nil {
		return nil, apperror.ErrInternal
	}
	refresh, err := GenerateRefreshToken(user)
	if err != nil {
		return nil, apperror.ErrInternal
	}
	user.Sanitize()
	return &dto.LoginResponse{
		User:         toUserResponse(user),
		AccessToken:  access,
		RefreshToken: refresh,
	}, nil
}

// GetUserFromBearer 从 Bearer Token 中获取用户信息
func GetUserFromBearer(authHeader string) (*model.User, error) {
	authHeader = strings.TrimSpace(authHeader)
	if authHeader == "" {
		return nil, apperror.ErrUnauthorized
	}
	token := strings.TrimPrefix(authHeader, "Bearer ")
	if token == authHeader {
		// try API access token
		return model.GetUserByAccessToken(authHeader)
	}
	claims, err := ParseToken(token)
	if err != nil || claims.Type != "access" {
		return nil, apperror.ErrUnauthorized
	}
	user, err := model.GetUserById(claims.UserId)
	if err != nil {
		return nil, apperror.ErrUnauthorized
	}
	if user.Status != common.UserStatusEnabled {
		return nil, apperror.New(403, 403, "account disabled")
	}
	return user, nil
}

func ListUsers(page, pageSize int) (*dto.PageResult, error) {
	users, total, err := model.ListUsers(page, pageSize)
	if err != nil {
		return nil, apperror.ErrInternal
	}
	return &dto.PageResult{Items: users, Total: total, Page: page, PageSize: pageSize}, nil
}

func DeleteUser(id int, operatorRole int) error {
	if operatorRole < common.RoleAdminUser {
		return apperror.ErrForbidden
	}
	user, err := model.GetUserById(id)
	if err != nil {
		return apperror.ErrNotFound
	}
	if user.Role >= common.RoleRootUser {
		return apperror.New(403, 403, "cannot delete root user")
	}
	if err := model.DeleteUser(id); err != nil {
		return apperror.ErrInternal
	}
	return nil
}

func GetCurrentUser(userId int) (*dto.UserResponse, error) {
	user, err := model.GetUserById(userId)
	if err != nil {
		return nil, apperror.ErrNotFound
	}
	resp := toUserResponse(user)
	return &resp, nil
}

func RefreshAccessToken(refreshToken string) (*dto.TokenResponse, error) {
	claims, err := ParseToken(refreshToken)
	if err != nil || claims.Type != "refresh" {
		return nil, apperror.New(401, 401, "invalid refresh token")
	}
	user, err := model.GetUserById(claims.UserId)
	if err != nil {
		return nil, apperror.ErrUnauthorized
	}
	if user.Status != common.UserStatusEnabled {
		return nil, apperror.New(403, 403, "account disabled")
	}
	access, err := GenerateAccessToken(user)
	if err != nil {
		return nil, apperror.ErrInternal
	}
	return &dto.TokenResponse{AccessToken: access}, nil
}

func CreateAPIToken(userId int) (*dto.APITokenResponse, error) {
	user, err := model.GetUserById(userId)
	if err != nil {
		return nil, apperror.ErrNotFound
	}
	token, err := GenerateAPIAccessToken(user)
	if err != nil {
		return nil, apperror.ErrInternal
	}
	return &dto.APITokenResponse{AccessToken: token}, nil
}

func RevokeAPIToken(userId int) error {
	user, err := model.GetUserById(userId)
	if err != nil {
		return apperror.ErrNotFound
	}
	user.AccessToken = nil
	if err := model.UpdateUser(user); err != nil {
		return apperror.ErrInternal
	}
	return nil
}
