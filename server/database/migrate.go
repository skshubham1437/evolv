package database

import (
	"embed"
	"errors"
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

// migrationsFS embeds all SQL migration files into the binary.
// This removes the runtime dependency on the filesystem path for SQL files.
//
//go:embed migrations/*.sql
var migrationsFS embed.FS

// RunMigrations applies all pending UP migrations from the embedded SQL files.
// It is safe to call on every startup — already-applied migrations are skipped.
// The server will fatal-exit if migrations fail, preventing startup with a
// partially-migrated schema.
func RunMigrations() {
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal("RunMigrations: failed to get underlying sql.DB:", err)
	}

	// Source: embedded migration files
	src, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		log.Fatal("RunMigrations: failed to create iofs source:", err)
	}

	// Driver: postgres (uses the existing pool connection)
	driver, err := postgres.WithInstance(sqlDB, &postgres.Config{})
	if err != nil {
		log.Fatal("RunMigrations: failed to create postgres driver:", err)
	}

	m, err := migrate.NewWithInstance("iofs", src, "postgres", driver)
	if err != nil {
		log.Fatal("RunMigrations: failed to create migrator:", err)
	}

	if err := m.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			log.Println("Migrations: schema is up to date")
			return
		}
		log.Fatal("RunMigrations: migration failed:", err)
	}

	version, dirty, _ := m.Version()
	fmt.Printf("Migrations: applied successfully (version=%d, dirty=%v)\n", version, dirty)
}
