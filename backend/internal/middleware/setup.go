package middleware

import "github.com/leap/backend/internal/model"

func modelIsInitialized() bool {
	return model.IsInitialized() || model.RootUserExists()
}
