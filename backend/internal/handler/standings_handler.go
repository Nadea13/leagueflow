package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"leagueflow-backend/internal/service"
)

type StandingsHandler struct {
	standingsService *service.StandingsService
}

func NewStandingsHandler(standingsService *service.StandingsService) *StandingsHandler {
	return &StandingsHandler{standingsService: standingsService}
}

func (h *StandingsHandler) GetByCategory(c *fiber.Ctx) error {
	categoryIDParam := c.Params("categoryId")
	categoryID, err := uuid.Parse(categoryIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid category ID",
		})
	}

	standings, err := h.standingsService.GetByCategory(c.Context(), categoryID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"category_id": categoryID,
		"standings":   standings,
	})
}

func (h *StandingsHandler) Recalculate(c *fiber.Ctx) error {
	categoryIDParam := c.Params("categoryId")
	categoryID, err := uuid.Parse(categoryIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid category ID",
		})
	}

	standings, err := h.standingsService.RecalculateAndSave(c.Context(), categoryID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"standings": standings,
	})
}
