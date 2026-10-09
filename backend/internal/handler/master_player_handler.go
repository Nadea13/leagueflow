package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"leagueflow-backend/internal/model"
	"leagueflow-backend/internal/service"
)

type MasterPlayerHandler struct {
	service *service.MasterPlayerService
}

func NewMasterPlayerHandler(service *service.MasterPlayerService) *MasterPlayerHandler {
	return &MasterPlayerHandler{service: service}
}

func (h *MasterPlayerHandler) List(c *fiber.Ctx) error {
	var userIDPtr *uuid.UUID
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if uID, err := uuid.Parse(userIDStr); err == nil {
			userIDPtr = &uID
		}
	}
	search := c.Query("search")

	list, err := h.service.List(c.Context(), userIDPtr, search)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if list == nil {
		list = []*model.MasterPlayer{}
	}
	return c.JSON(list)
}

func (h *MasterPlayerHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid player ID"})
	}

	p, err := h.service.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if p == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Master player not found"})
	}
	return c.JSON(p)
}

func (h *MasterPlayerHandler) Create(c *fiber.Ctx) error {
	var p model.MasterPlayer
	if err := c.BodyParser(&p); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	if userIDVal := c.Locals("user_id"); userIDVal != nil {
		if uID, ok := userIDVal.(uuid.UUID); ok && p.UserID == nil {
			p.UserID = &uID
		}
	}

	if err := h.service.Create(c.Context(), &p); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(p)
}

func (h *MasterPlayerHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid player ID"})
	}

	var p model.MasterPlayer
	if err := c.BodyParser(&p); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}
	p.ID = id

	if err := h.service.Update(c.Context(), &p); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Master player updated successfully", "player": p})
}

func (h *MasterPlayerHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid player ID"})
	}

	if err := h.service.Delete(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Master player deleted successfully"})
}
