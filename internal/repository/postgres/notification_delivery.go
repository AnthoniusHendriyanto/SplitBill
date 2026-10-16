package postgres

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5"
	"log"
	"net/http"
	"strings"
	"time"
)

// DeliverEmails uses row locks to coordinate workers. Resend deduplicates ambiguous retries for 24h.
func (r *NotificationRepository) DeliverEmails(ctx context.Context, key, from, frontendURL string) {
	if key == "" || from == "" {
		log.Print("Assignment email delivery disabled: configure RESEND_API_KEY and EMAIL_FROM; jobs remain queued")
		return
	}
	client := &http.Client{Timeout: 15 * time.Second}
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			for i := 0; i < 20; i++ {
				more, err := r.deliverOne(ctx, client, key, from, frontendURL)
				if err != nil {
					log.Printf("Assignment email worker: %v", err)
					break
				}
				if !more {
					break
				}
			}
		}
	}
}
func (r *NotificationRepository) deliverOne(ctx context.Context, client *http.Client, key, from, frontendURL string) (bool, error) {
	tx, err := r.Pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)
	var id, email, billID string
	var attempts int
	var created time.Time
	err = tx.QueryRow(ctx, `SELECT n.id,u.email,n.bill_id,n.attempts,n.created_at FROM notifications n JOIN users u ON u.id=n.user_id WHERE n.email_status='queued' AND n.next_attempt_at<=NOW() ORDER BY n.next_attempt_at FOR UPDATE OF n SKIP LOCKED LIMIT 1`).Scan(&id, &email, &billID, &attempts, &created)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	// Registration currently has no mailbox verification. Keep financial details behind authenticated access.
	body, _ := json.Marshal(map[string]interface{}{"from": from, "to": []string{email}, "subject": "A SplitMate assignment is ready", "text": "You have a new bill assignment in SplitMate. Sign in to review it: " + strings.TrimRight(frontendURL, "/") + "/bill/" + billID})
	status := "queued"
	message := ""
	attempts++
	if attempts > 1 && time.Since(created) > 23*time.Hour {
		status = "failed"
		message = "Retry window expired; review provider logs before manual retry"
	} else {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
		if err != nil {
			return false, err
		}
		req.Header.Set("Authorization", "Bearer "+key)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", "assignment/"+id)
		res, err := client.Do(req)
		if err != nil {
			message = "Email request failed or timed out"
		} else {
			res.Body.Close()
			if res.StatusCode >= 200 && res.StatusCode < 300 {
				status = "sent"
			} else {
				message = fmt.Sprintf("Email provider HTTP %d", res.StatusCode)
				if res.StatusCode >= 400 && res.StatusCode < 500 && res.StatusCode != 429 {
					status = "failed"
				}
			}
		}
		if status == "queued" && attempts >= 6 {
			status = "failed"
		}
	}
	_, err = tx.Exec(ctx, `UPDATE notifications SET email_status=$1,attempts=$2,last_error=$3,next_attempt_at=NOW()+($4 * INTERVAL '1 minute') WHERE id=$5`, status, attempts, message, 1<<min(attempts, 6), id)
	if err != nil {
		return false, err
	}
	return true, tx.Commit(ctx)
}
