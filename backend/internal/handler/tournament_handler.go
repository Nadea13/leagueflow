package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"leagueflow-backend/internal/model"
	"leagueflow-backend/internal/service"
)

type TournamentHandler struct {
	tournamentService *service.TournamentService
}

func NewTournamentHandler(tournamentService *service.TournamentService) *TournamentHandler {
	return &TournamentHandler{tournamentService: tournamentService}
}

func (h *TournamentHandler) List(c *fiber.Ctx) error {
	status := c.Query("status")
	organizerIDStr := c.Query("organizer_id")
	var organizerID *uuid.UUID
	if organizerIDStr != "" {
		if parsed, err := uuid.Parse(organizerIDStr); err == nil {
			organizerID = &parsed
		}
	}

	tournaments, err := h.tournamentService.List(c.Context(), status, organizerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	if tournaments == nil {
		tournaments = []*model.Tournament{}
	}

	return c.JSON(fiber.Map{
		"data": tournaments,
	})
}

func (h *TournamentHandler) GetByID(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tournament ID",
		})
	}

	tournament, categories, err := h.tournamentService.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	if tournament == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Tournament not found",
		})
	}
	if categories == nil {
		categories = []*model.TournamentCategory{}
	}

	return c.JSON(fiber.Map{
		"tournament": tournament,
		"categories": categories,
	})
}

func (h *TournamentHandler) Create(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var input service.CreateTournamentInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if input.Name == "" || input.StartDate == "" || input.EndDate == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Name, start date, and end date are required",
		})
	}

	tournament, err := h.tournamentService.Create(c.Context(), userID, input)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(tournament)
}

func (h *TournamentHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament ID"})
	}

	var t model.Tournament
	if err := c.BodyParser(&t); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}
	t.ID = id

	if err := h.tournamentService.Update(c.Context(), &t); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Tournament updated successfully", "tournament": t})
}

func (h *TournamentHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament ID"})
	}

	if err := h.tournamentService.Delete(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Tournament deleted successfully"})
}

func (h *TournamentHandler) GetCategories(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament ID"})
	}

	categories, err := h.tournamentService.GetCategories(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if categories == nil {
		categories = []*model.TournamentCategory{}
	}
	return c.JSON(categories)
}

func (h *TournamentHandler) CreateCategory(c *fiber.Ctx) error {
	idParam := c.Params("id")
	tournamentID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tournament ID",
		})
	}

	var input service.CreateCategoryInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if input.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Category name is required",
		})
	}

	category, err := h.tournamentService.CreateCategory(c.Context(), tournamentID, input)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(category)
}

func (h *TournamentHandler) UpdateCategoryCanvas(c *fiber.Ctx) error {
	categoryIDParam := c.Params("categoryId")
	categoryID, err := uuid.Parse(categoryIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid category ID",
		})
	}

	var input struct {
		CanvasData map[string]interface{} `json:"canvas_data"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if input.CanvasData == nil {
		input.CanvasData = make(map[string]interface{})
	}

	if err := h.tournamentService.UpdateCategoryCanvas(c.Context(), categoryID, input.CanvasData); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success":     true,
		"canvas_data": input.CanvasData,
	})
}

func (h *TournamentHandler) UpdateCategory(c *fiber.Ctx) error {
	categoryID, err := uuid.Parse(c.Params("categoryId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	var cat model.TournamentCategory
	if err := c.BodyParser(&cat); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}
	cat.ID = categoryID

	if err := h.tournamentService.UpdateCategory(c.Context(), &cat); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Category updated successfully", "category": cat})
}

func (h *TournamentHandler) DeleteCategory(c *fiber.Ctx) error {
	categoryID, err := uuid.Parse(c.Params("categoryId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	if err := h.tournamentService.DeleteCategory(c.Context(), categoryID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Category deleted successfully"})
}
