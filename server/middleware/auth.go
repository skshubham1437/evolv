package middleware

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "user_id"

// CookieName is the httpOnly session cookie used for authentication.
// All auth handlers must use this constant to set/clear the cookie.
const CookieName = "evolv_session"

// JWTAuth validates the httpOnly session cookie and injects user_id into
// the request context. Falls back to the Authorization header to maintain
// compatibility with any existing non-browser clients during migration.
func JWTAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenString := ""

		// Primary: read from httpOnly cookie (secure, XSS-immune)
		if cookie, err := r.Cookie(CookieName); err == nil {
			tokenString = cookie.Value
		}

		// Fallback: Authorization header (for API clients / migration period)
		if tokenString == "" {
			authHeader := r.Header.Get("Authorization")
			if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				tokenString = authHeader[7:]
			}
		}

		if tokenString == "" {
			http.Error(w, `{"error":"authentication required"}`, http.StatusUnauthorized)
			return
		}

		secret := os.Getenv("JWT_SECRET")
		// JWT_SECRET length is guaranteed by the startup check in main.go.

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			http.Error(w, `{"error":"invalid or expired session"}`, http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, `{"error":"invalid token claims"}`, http.StatusUnauthorized)
			return
		}

		userIDFloat, ok := claims["user_id"].(float64)
		if !ok {
			http.Error(w, `{"error":"invalid user_id in token"}`, http.StatusUnauthorized)
			return
		}

		userID := uint(userIDFloat)
		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserID extracts the authenticated user ID from a request context.
func GetUserID(r *http.Request) uint {
	userID, _ := r.Context().Value(UserIDKey).(uint)
	return userID
}
