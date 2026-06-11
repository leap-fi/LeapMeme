package apperror

import "testing"

func TestNew(t *testing.T) {
	err := New(400, 400, "bad input")
	if err.HTTPStatus != 400 || err.Code != 400 || err.Error() != "bad input" {
		t.Fatalf("unexpected error: %+v", err)
	}
}

func TestValidation(t *testing.T) {
	err := Validation("invalid field")
	if err.HTTPStatus != 400 {
		t.Fatalf("expected 400, got %d", err.HTTPStatus)
	}
}

func TestConflict(t *testing.T) {
	err := Conflict("duplicate")
	if err.HTTPStatus != 409 {
		t.Fatalf("expected 409, got %d", err.HTTPStatus)
	}
}
