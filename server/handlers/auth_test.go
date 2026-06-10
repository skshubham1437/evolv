package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"evolv-server/database"
	"evolv-server/middleware"
	"evolv-server/models"
	"golang.org/x/crypto/bcrypt"
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

func TestRegisterSuccess(t *testing.T) {
	originalDB := database.DB
	tx := originalDB.Begin()
	defer func() {
		tx.Rollback()
		database.DB = originalDB
	}()
	database.DB = tx

	os.Setenv("JWT_SECRET", "super-secret-key-for-testing-only-123456")

	body := `{"email":"newuser@evolv.me","password":"password123","name":"New User"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	Register(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d. Body: %s", http.StatusCreated, rr.Code, rr.Body.String())
	}

	// Verify user is in database
	var user models.User
	if err := tx.Where("email = ?", "newuser@evolv.me").First(&user).Error; err != nil {
		t.Fatalf("expected user to be created in DB: %v", err)
	}

	if user.Name != "New User" {
		t.Errorf("expected user name to be 'New User', got %q", user.Name)
	}
}

func TestLoginSuccess(t *testing.T) {
	originalDB := database.DB
	tx := originalDB.Begin()
	defer func() {
		tx.Rollback()
		database.DB = originalDB
	}()
	database.DB = tx

	os.Setenv("JWT_SECRET", "super-secret-key-for-testing-only-123456")

	// Seed user
	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := models.User{
		Email:        "existing@evolv.me",
		PasswordHash: string(hash),
		Name:         "Existing User",
	}
	if err := tx.Create(&user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	body := `{"email":"existing@evolv.me","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	Login(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d. Body: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var resp authResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode login response: %v", err)
	}

	if resp.User.Email != "existing@evolv.me" {
		t.Errorf("expected logged in user email existing@evolv.me, got %q", resp.User.Email)
	}
}

func TestUpdateMeSuccess(t *testing.T) {
	originalDB := database.DB
	tx := originalDB.Begin()
	defer func() {
		tx.Rollback()
		database.DB = originalDB
	}()
	database.DB = tx

	// Seed user
	hash, _ := bcrypt.GenerateFromPassword([]byte("oldpassword"), bcrypt.DefaultCost)
	user := models.User{
		Email:        "updateme@evolv.me",
		PasswordHash: string(hash),
		Name:         "Old Name",
	}
	if err := tx.Create(&user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	// Mock authenticated context
	body := `{"name":"New Name","email":"newemail@evolv.me","current_password":"oldpassword"}`
	req := httptest.NewRequest(http.MethodPut, "/api/auth/me", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	
	// Inject user ID into request context
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, user.ID)
	req = req.WithContext(ctx)
	
	rr := httptest.NewRecorder()

	UpdateMe(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d. Body: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	// Fetch from DB and verify
	var updated models.User
	if err := tx.First(&updated, user.ID).Error; err != nil {
		t.Fatalf("failed to fetch user: %v", err)
	}

	if updated.Name != "New Name" {
		t.Errorf("expected name to be updated to 'New Name', got %q", updated.Name)
	}
	if updated.Email != "newemail@evolv.me" {
		t.Errorf("expected email to be updated to 'newemail@evolv.me', got %q", updated.Email)
	}
}
