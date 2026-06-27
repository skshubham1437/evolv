package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"evolv-server/database"
	"evolv-server/middleware"
	"evolv-server/models"
	"evolv-server/services"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// ── Cookie helpers ────────────────────────────────────────────────────────────

// setSessionCookie writes the JWT into a Secure, HttpOnly, SameSite=Lax cookie.
// The cookie lives for 72 hours, matching the token expiry.
func setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     middleware.CookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int((72 * time.Hour).Seconds()),
		HttpOnly: true,              // immune to XSS / document.cookie access
		Secure:   isProduction(),   // HTTPS-only in production
		SameSite: http.SameSiteLaxMode,
	})
}

// clearSessionCookie invalidates the session cookie.
func clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     middleware.CookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   isProduction(),
		SameSite: http.SameSiteLaxMode,
	})
}

// isProduction reports whether the server is running in a production environment.
func isProduction() bool {
	env := os.Getenv("APP_ENV")
	return env == "production" || env == "prod"
}

// ── Request / Response types ──────────────────────────────────────────────────

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	User models.User `json:"user"`
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// Register creates a new user account and sets a session cookie.
func Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Name = strings.TrimSpace(req.Name)

	if req.Email == "" || req.Password == "" || req.Name == "" {
		http.Error(w, `{"error":"email, password, and name are required"}`, http.StatusBadRequest)
		return
	}
	if len(req.Password) < 8 {
		http.Error(w, `{"error":"password must be at least 8 characters"}`, http.StatusBadRequest)
		return
	}

	// Check if email already exists
	var existing models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		http.Error(w, `{"error":"email already registered"}`, http.StatusConflict)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	user := models.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		Name:         req.Name,
	}
	if err := database.DB.Create(&user).Error; err != nil {
		http.Error(w, `{"error":"could not create user"}`, http.StatusInternalServerError)
		return
	}

	token, err := generateJWT(user.ID)
	if err != nil {
		http.Error(w, `{"error":"could not generate session"}`, http.StatusInternalServerError)
		return
	}

	setSessionCookie(w, token)
	w.WriteHeader(http.StatusCreated)
	respond(w, authResponse{User: user})
}

// Login authenticates a user and sets a session cookie.
func Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		http.Error(w, `{"error":"invalid email or password"}`, http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		http.Error(w, `{"error":"invalid email or password"}`, http.StatusUnauthorized)
		return
	}

	token, err := generateJWT(user.ID)
	if err != nil {
		http.Error(w, `{"error":"could not generate session"}`, http.StatusInternalServerError)
		return
	}

	setSessionCookie(w, token)
	respond(w, authResponse{User: user})
}

// Logout clears the session cookie.
func Logout(w http.ResponseWriter, r *http.Request) {
	clearSessionCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

// GetMe returns the currently authenticated user's profile.
func GetMe(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}
	respond(w, user)
}

// UpdateMe updates the authenticated user's profile.
// Email changes require the current password to be confirmed.
func UpdateMe(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	type UpdateRequest struct {
		Name                *string `json:"name"`
		Email               *string `json:"email"`
		CurrentPassword     *string `json:"current_password"` // required for email change
		Preferences         *string `json:"preferences"`
		PushEnabled         *bool   `json:"push_enabled"`
		WeeklyDigestEnabled *bool   `json:"weekly_digest_enabled"`
	}

	var req UpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Email update requires current password re-confirmation.
	if req.Email != nil {
		if req.CurrentPassword == nil || *req.CurrentPassword == "" {
			http.Error(w, `{"error":"current_password is required to change email"}`, http.StatusBadRequest)
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(*req.CurrentPassword)); err != nil {
			http.Error(w, `{"error":"current password is incorrect"}`, http.StatusForbidden)
			return
		}
		// Check email uniqueness (excluding self).
		newEmail := strings.TrimSpace(strings.ToLower(*req.Email))
		var existing models.User
		if err := database.DB.Where("email = ? AND id != ?", newEmail, userID).First(&existing).Error; err == nil {
			http.Error(w, `{"error":"email already in use"}`, http.StatusConflict)
			return
		}
		user.Email = newEmail
	}

	if req.Name != nil {
		user.Name = strings.TrimSpace(*req.Name)
	}
	if req.Preferences != nil {
		user.Preferences = *req.Preferences
	}
	if req.PushEnabled != nil {
		user.PushEnabled = *req.PushEnabled
	}
	if req.WeeklyDigestEnabled != nil {
		user.WeeklyDigestEnabled = *req.WeeklyDigestEnabled
	}

	if err := database.DB.Save(&user).Error; err != nil {
		http.Error(w, `{"error":"failed to update profile"}`, http.StatusInternalServerError)
		return
	}

	respond(w, user)
}

// ChangePassword allows an authenticated user to change their password.
// Requires the current password for re-authentication.
func ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		http.Error(w, `{"error":"current_password and new_password are required"}`, http.StatusBadRequest)
		return
	}
	if len(req.NewPassword) < 8 {
		http.Error(w, `{"error":"new_password must be at least 8 characters"}`, http.StatusBadRequest)
		return
	}
	if req.CurrentPassword == req.NewPassword {
		http.Error(w, `{"error":"new password must differ from current password"}`, http.StatusBadRequest)
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		http.Error(w, `{"error":"current password is incorrect"}`, http.StatusForbidden)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	if err := database.DB.Model(&user).Update("password_hash", string(hash)).Error; err != nil {
		http.Error(w, `{"error":"failed to update password"}`, http.StatusInternalServerError)
		return
	}

	// Re-issue a fresh session token after password change.
	token, err := generateJWT(user.ID)
	if err != nil {
		http.Error(w, `{"error":"password updated but could not refresh session"}`, http.StatusInternalServerError)
		return
	}
	setSessionCookie(w, token)
	w.WriteHeader(http.StatusNoContent)
}

// ── JWT generation ────────────────────────────────────────────────────────────

func generateJWT(userID uint) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	// Length guarantee is enforced by the startup check in main.go.

	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(72 * time.Hour).Unix(), // 3-day expiry
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ForgotPassword handles password recovery requests.
func ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" {
		http.Error(w, `{"error":"email is required"}`, http.StatusBadRequest)
		return
	}

	// Email enumeration prevention: always return 200 OK with success message.
	var user models.User
	if err := database.DB.Where("email = ?", email).First(&user).Error; err == nil {
		resetLink := "http://localhost:5173/reset-password?token=mock-token-xyz"
		body := fmt.Sprintf(`<h2>Evolv Password Reset</h2>
<p>Hello %s,</p>
<p>We received a request to reset your password. Click the link below to verify your identity and set a new password:</p>
<p style="margin: 20px 0;"><a href="%s" style="padding: 10px 20px; background: #6C4AB0; color: #FFFFFF; text-decoration: none; font-family: sans-serif;">Reset Password</a></p>
<p>If you did not request this, you can safely ignore this email.</p>`, user.Name, resetLink)
		_ = services.SendEmail(user.Email, "Evolv — Password Reset Request", body)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success":true,"message":"If this email exists in our system, reset instructions have been sent."}`))
}
