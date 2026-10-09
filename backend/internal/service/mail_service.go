package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"net/smtp"
	"time"

	"github.com/redis/go-redis/v9"

	"leagueflow-backend/internal/config"
)

type MailService struct {
	redis *redis.Client
	cfg   *config.Config
}

func NewMailService(redis *redis.Client, cfg *config.Config) *MailService {
	return &MailService{
		redis: redis,
		cfg:   cfg,
	}
}

// GenerateOTP creates a secure 6-digit random code
func (s *MailService) GenerateOTP() string {
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "123456"
	}
	return fmt.Sprintf("%06d", n.Int64()+100000)
}

// SendVerificationOTP generates and sends an OTP code (Resend in prod, Mailpit in local dev)
func (s *MailService) SendVerificationOTP(ctx context.Context, email string) error {
	otp := s.GenerateOTP()

	// 1. Save to Redis with 5 minutes TTL
	redisKey := fmt.Sprintf("otp:verify:%s", email)
	err := s.redis.Set(ctx, redisKey, otp, 5*time.Minute).Err()
	if err != nil {
		return fmt.Errorf("failed to store OTP in cache: %w", err)
	}

	htmlContent := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
			<h2 style="color: #00C49A; text-align: center;">LeagueFlow</h2>
			<p style="font-size: 16px; color: #333;">สวัสดีครับ,</p>
			<p style="font-size: 14px; color: #555;">รหัสยืนยัน OTP 6 หลักของคุณคือ:</p>
			<div style="background-color: #f4f6f8; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #111; border-radius: 6px; margin: 20px 0;">
				%s
			</div>
			<p style="font-size: 13px; color: #888;">รหัสนี้มีอายุการใช้งาน 5 นาที หากคุณไม่ได้ทำรายการ โปรดเพิกเฉยต่ออีเมลนี้</p>
		</div>
	`, otp)

	// 2. If Resend API Key is provided, use Resend API
	if s.cfg.ResendAPIKey != "" {
		return s.sendResendEmail(email, "Your LeagueFlow Verification Code", htmlContent)
	}

	// 3. Otherwise, send to Mailpit via SMTP in local development
	log.Printf("📧 [DEV MODE] Sending OTP %s to %s via Mailpit", otp, email)
	return s.sendSMTPEmail(email, "Your LeagueFlow Verification Code", htmlContent)
}

func (s *MailService) sendSMTPEmail(to, subject, htmlContent string) error {
	addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)
	
	msg := []byte(fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"MIME-version: 1.0;\r\n"+
		"Content-Type: text/html; charset=\"UTF-8\";\r\n\r\n"+
		"%s\r\n", s.cfg.ResendFromEmail, to, subject, htmlContent))

	err := smtp.SendMail(addr, nil, "no-reply@leagueflow.io", []string{to}, msg)
	if err != nil {
		log.Printf("⚠️ SMTP sending warning: %v (logged OTP to console)", err)
		return nil
	}

	log.Printf("📧 Email delivered to Mailpit for %s", to)
	return nil
}

// VerifyOTP checks if the provided OTP matches what is stored in Redis
func (s *MailService) VerifyOTP(ctx context.Context, email, otp string) (bool, error) {
	redisKey := fmt.Sprintf("otp:verify:%s", email)
	storedOTP, err := s.redis.Get(ctx, redisKey).Result()
	if err != nil {
		if err == redis.Nil {
			return false, errors.New("OTP has expired or is invalid")
		}
		return false, fmt.Errorf("failed to retrieve OTP: %w", err)
	}

	if storedOTP != otp {
		return false, errors.New("incorrect OTP code")
	}

	// Delete OTP after successful verification
	_ = s.redis.Del(ctx, redisKey).Err()

	// Mark email as verified in Redis for 15 minutes
	verifiedKey := fmt.Sprintf("email:verified:%s", email)
	_ = s.redis.Set(ctx, verifiedKey, "true", 15*time.Minute).Err()

	return true, nil
}

// IsEmailVerified checks if an email was recently verified via OTP
func (s *MailService) IsEmailVerified(ctx context.Context, email string) bool {
	verifiedKey := fmt.Sprintf("email:verified:%s", email)
	val, err := s.redis.Get(ctx, verifiedKey).Result()
	return err == nil && val == "true"
}

func (s *MailService) sendResendEmail(to, subject, htmlContent string) error {
	payload := map[string]interface{}{
		"from":    s.cfg.ResendFromEmail,
		"to":      []string{to},
		"subject": subject,
		"html":    htmlContent,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.cfg.ResendAPIKey))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("resend request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("resend returned status code: %d", resp.StatusCode)
	}

	log.Printf("📧 Resend email sent successfully to %s", to)
	return nil
}
