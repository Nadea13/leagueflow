package service

import (
	"context"
	"strconv"
	"testing"
	"time"

	"leagueflow-backend/internal/config"
)

func TestGenerateOTP(t *testing.T) {
	s := NewMailService(nil, &config.Config{})

	for i := 0; i < 20; i++ {
		otp := s.GenerateOTP()
		if len(otp) != 6 {
			t.Fatalf("expected 6 digits, got %s", otp)
		}
		num, err := strconv.Atoi(otp)
		if err != nil {
			t.Fatalf("expected numeric string, got error: %v", err)
		}
		if num < 100000 || num > 999999 {
			t.Fatalf("expected number between 100000 and 999999, got %d", num)
		}
	}
}

func TestInMemoryOTPVerification(t *testing.T) {
	ctx := context.Background()
	s := NewMailService(nil, &config.Config{})
	testEmail := "test@leagueflow.dev"
	testOTP := "458921"

	// 1. Manually insert OTP into in-memory cache
	s.cacheLock.Lock()
	s.memCache[testEmail] = otpItem{
		code:      testOTP,
		expiresAt: time.Now().Add(5 * time.Minute),
	}
	s.cacheLock.Unlock()

	// 2. Test wrong OTP
	success, err := s.VerifyOTP(ctx, testEmail, "000000")
	if success || err == nil {
		t.Fatal("expected wrong OTP to fail verification")
	}

	// 3. Test correct OTP
	success, err = s.VerifyOTP(ctx, testEmail, testOTP)
	if err != nil || !success {
		t.Fatalf("expected correct OTP to succeed, got err: %v", err)
	}

	// 4. Test replay attack (OTP should be consumed/cleared)
	success, err = s.VerifyOTP(ctx, testEmail, testOTP)
	if success || err == nil {
		t.Fatal("expected reused OTP to fail verification")
	}

	// 5. Test IsEmailVerified
	verified := s.IsEmailVerified(ctx, testEmail)
	if !verified {
		t.Fatal("expected email to be verified after successful OTP check")
	}
}
