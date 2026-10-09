package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"leagueflow-backend/internal/model"
	"leagueflow-backend/internal/service"
)

type TeamHandler struct {
	teamService *service.TeamService
}

func NewTeamHandler(teamService *service.TeamService) *TeamHandler {
	return &TeamHandler{teamService: teamService}
}

func (h *TeamHandler) List(c *fiber.Ctx) error {
	var userIDPtr *uuid.UUID
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if uID, err := uuid.Parse(userIDStr); err == nil {
			userIDPtr = &uID
		}
	}

	teams, err := h.teamService.ListTeams(c.Context(), userIDPtr)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if teams == nil {
		teams = []*model.Team{}
	}
	return c.JSON(teams)
}

func (h *TeamHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid team ID"})
	}

	team, err := h.teamService.GetTeamByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if team == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Team not found"})
	}
	return c.JSON(team)
}

func (h *TeamHandler) Create(c *fiber.Ctx) error {
	var team model.Team
	if err := c.BodyParser(&team); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	// Set user_id from auth token if present
	if userIDVal := c.Locals("user_id"); userIDVal != nil {
		if uID, ok := userIDVal.(uuid.UUID); ok && team.UserID == nil {
			team.UserID = &uID
		}
	}

	if err := h.teamService.CreateTeam(c.Context(), &team); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(team)
}

func (h *TeamHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid team ID"})
	}

	var team model.Team
	if err := c.BodyParser(&team); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}
	team.ID = id

	if err := h.teamService.UpdateTeam(c.Context(), &team); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Team updated successfully", "team": team})
}

func (h *TeamHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid team ID"})
	}

	if err := h.teamService.DeleteTeam(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Team deleted successfully"})
}

// Players subroutes
func (h *TeamHandler) GetPlayers(c *fiber.Ctx) error {
	teamID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid team ID"})
	}

	players, err := h.teamService.GetTeamPlayers(c.Context(), teamID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if players == nil {
		players = []*model.Player{}
	}
	return c.JSON(players)
}

func (h *TeamHandler) AddPlayer(c *fiber.Ctx) error {
	teamID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid team ID"})
	}

	var p model.Player
	if err := c.BodyParser(&p); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}
	p.TeamID = teamID

	if err := h.teamService.AddPlayer(c.Context(), &p); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(p)
}

func (h *TeamHandler) UpdatePlayer(c *fiber.Ctx) error {
	playerID, err := uuid.Parse(c.Params("playerId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid player ID"})
	}

	var p model.Player
	if err := c.BodyParser(&p); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}
	p.ID = playerID

	if err := h.teamService.UpdatePlayer(c.Context(), &p); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(p)
}

func (h *TeamHandler) DeletePlayer(c *fiber.Ctx) error {
	playerID, err := uuid.Parse(c.Params("playerId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid player ID"})
	}

	if err := h.teamService.DeletePlayer(c.Context(), playerID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Player removed successfully"})
}

