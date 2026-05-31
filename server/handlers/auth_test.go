package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestRegisterValidation verifies that the Register handler rejects
// requests with missing fields and short passwords.
func TestRegisterValidation(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "empty body",
			body:       `{}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing password",
			body:       `{"email":"a@b.com","name":"Test"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing email",
			body:       `{"password":"123456","name":"Test"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing name",
			body:       `{"email":"a@b.com","password":"123456"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "password too short",
			body:       `{"email":"a@b.com","password":"12345","name":"Test"}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()

			Register(rr, req)

			if rr.Code != tt.wantStatus {
				t.Errorf("Register() status = %d, want %d; body = %s", rr.Code, tt.wantStatus, rr.Body.String())
			}
		})
	}
}

// TestLoginValidation verifies that the Login handler rejects malformed input.
func TestLoginValidation(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "invalid json",
			body:       `{invalid`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()

			Login(rr, req)

			if rr.Code != tt.wantStatus {
				t.Errorf("Login() status = %d, want %d", rr.Code, tt.wantStatus)
			}
		})
	}
}
