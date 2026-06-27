package services

import (
	"fmt"
	"log/slog"
	"net/smtp"
	"os"
)

// SendEmail delivers an email using SMTP or logs it to stdout if unconfigured
func SendEmail(to, subject, bodyHTML string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	from := os.Getenv("SMTP_FROM")

	if host == "" || port == "" || from == "" {
		slog.Info("SMTP is unconfigured. Logging email body to console (dev mode):",
			"to", to,
			"subject", subject,
			"body", bodyHTML,
		)
		return nil
	}

	addr := fmt.Sprintf("%s:%s", host, port)
	auth := smtp.PlainAuth("", user, pass, host)

	// Format MIME headers
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	msg := []byte(fmt.Sprintf("To: %s\r\nSubject: %s\r\n%s%s", to, subject, mime, bodyHTML))

	err := smtp.SendMail(addr, auth, from, []string{to}, msg)
	if err != nil {
		slog.Error("SMTP delivery failed", "error", err, "to", to)
		return err
	}

	slog.Info("SMTP email delivered successfully", "to", to, "subject", subject)
	return nil
}
