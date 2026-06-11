package apperror

import "net/http"

type AppError struct {
	HTTPStatus int
	Code       int
	Message    string
}

func (e *AppError) Error() string {
	return e.Message
}

func New(httpStatus, code int, message string) *AppError {
	return &AppError{
		HTTPStatus: httpStatus,
		Code:       code,
		Message:    message,
	}
}

var (
	ErrUnauthorized = New(http.StatusUnauthorized, 401, "unauthorized")
	ErrForbidden    = New(http.StatusForbidden, 403, "forbidden")
	ErrNotFound     = New(http.StatusNotFound, 404, "not found")
	ErrBadRequest   = New(http.StatusBadRequest, 400, "bad request")
	ErrInternal     = New(http.StatusInternalServerError, 500, "internal server error")
)

func Validation(message string) *AppError {
	return New(http.StatusBadRequest, 400, message)
}

func Conflict(message string) *AppError {
	return New(http.StatusConflict, 409, message)
}
