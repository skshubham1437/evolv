package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Fallback for local dev if not set
		dsn = "host=localhost user=postgres password=postgres dbname=evolv port=5432 sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Configure connection pool to prevent exhausting PostgreSQL's max_connections.
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to get underlying sql.DB:", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	// Verify the connection is alive before proceeding.
	if err := sqlDB.Ping(); err != nil {
		log.Fatal("Database ping failed:", err)
	}

	DB = db
	fmt.Println("Database connection established (pool: max=25, idle=10, lifetime=5m)")
}
