package main

import (
	"fmt"
	"log"

	"evolv-server/database"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	database.Connect()

	// Query all base tables in the public schema
	var tables []string
	err := database.DB.Raw(`
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public' 
		  AND table_type = 'BASE TABLE'
		  AND table_name NOT LIKE 'schema_migrations%'
	`).Scan(&tables).Error

	if err != nil {
		log.Fatalf("Failed to retrieve table names: %v", err)
	}

	if len(tables) == 0 {
		fmt.Println("No user data tables found in database.")
		return
	}

	// Build the TRUNCATE CASCADE SQL query
	query := "TRUNCATE TABLE "
	for i, table := range tables {
		if i > 0 {
			query += ", "
		}
		query += fmt.Sprintf("\"%s\"", table)
	}
	query += " CASCADE;"

	fmt.Println("Clearing all user data from database tables...")
	if err := database.DB.Exec(query).Error; err != nil {
		log.Fatalf("Failed to truncate database tables: %v", err)
	}

	fmt.Println("🎉 Database successfully cleared of all user data!")
}
