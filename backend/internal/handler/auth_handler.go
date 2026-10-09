package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"leagueflow-backend/internal/repository"
	"leagueflow-backend/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
	mailService *service.MailService
	userRepo    *repository.UserRepository
}

func NewAuthHandler(authService *service.AuthService, mailService *service.MailService, userRepo *repository.UserRepository) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		mailService: mailService,
		userRepo:    userRepo,
	}
}

func (h *AuthHandler) SendOTP(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email"`
	}

	if err := c.BodyParser(&req); err != nil || req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email is required",
		})
	}

	if err := h.mailService.SendVerificationOTP(c.Context(), req.Email); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "OTP verification code sent successfully",
	})
}

func (h *AuthHandler) VerifyOTP(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
	}

	if err := c.BodyParser(&req); err != nil || req.Email == "" || req.OTP == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email and OTP are required",
		})
	}

	success, err := h.mailService.VerifyOTP(c.Context(), req.Email, req.OTP)
	if err != nil || !success {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Email verified successfully",
	})
}

func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req struct {
		Email       string `json:"email"`
		NewPassword string `json:"new_password"`
	}

	if err := c.BodyParser(&req); err != nil || req.Email == "" || req.NewPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email and new password are required",
		})
	}

	// Verify that email was OTP verified recently
	if !h.mailService.IsEmailVerified(c.Context(), req.Email) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Email is not verified via OTP or session expired",
		})
	}

	if err := h.authService.ResetPassword(c.Context(), req.Email, req.NewPassword); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Password updated successfully",
	})
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var input service.RegisterInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if input.Email == "" || input.Password == "" || input.FullName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email, password, and full name are required",
		})
	}

	resp, err := h.authService.Register(c.Context(), input)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(resp)
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var input service.LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if input.Email == "" || input.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email and password are required",
		})
	}

	resp, err := h.authService.Login(c.Context(), input)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(resp)
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := c.BodyParser(&req); err != nil || req.RefreshToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Refresh token is required",
		})
	}

	resp, err := h.authService.RefreshToken(c.Context(), req.RefreshToken)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(resp)
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	user, err := h.userRepo.GetByID(c.Context(), userID)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	return c.JSON(user)
}

func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req struct {
		FullName  string  `json:"full_name"`
		Phone     *string `json:"phone"`
		AvatarURL *string `json:"avatar_url"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.FullName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Full name is required",
		})
	}

	user, err := h.userRepo.UpdateProfile(c.Context(), userID, req.FullName, req.Phone, req.AvatarURL)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(user)
}

func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Current password and new password are required",
		})
	}

	if len(req.NewPassword) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "New password must be at least 6 characters long",
		})
	}

	if err := h.authService.ChangePassword(c.Context(), userID, req.CurrentPassword, req.NewPassword); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Password changed successfully",
	})
}


