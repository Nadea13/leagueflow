package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"tourni-backend/internal/model"
	"tourni-backend/internal/service"
)

type RegistrationHandler struct {
	service *service.RegistrationService
}

func NewRegistrationHandler(service *service.RegistrationService) *RegistrationHandler {
	return &RegistrationHandler{service: service}
}

func (h *RegistrationHandler) ListTournamentTeams(c *fiber.Ctx) error {
	var tournamentIDPtr, categoryIDPtr *uuid.UUID

	if tIDStr := c.Params("id"); tIDStr != "" {
		if tID, err := uuid.Parse(tIDStr); err == nil {
			tournamentIDPtr = &tID
		}
	} else if tIDStr := c.Query("tournament_id"); tIDStr != "" {
		if tID, err := uuid.Parse(tIDStr); err == nil {
			tournamentIDPtr = &tID
		}
	}

	if catIDStr := c.Query("category_id"); catIDStr != "" {
		if catID, err := uuid.Parse(catIDStr); err == nil {
			categoryIDPtr = &catID
		}
	}

	teams, err := h.service.ListTournamentTeams(c.Context(), tournamentIDPtr, categoryIDPtr)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if teams == nil {
		teams = []*model.TournamentTeam{}
	}
	return c.JSON(teams)
}

func (h *RegistrationHandler) GetTournamentTeam(c *fiber.Ctx) error {
	idStr := c.Params("regId")
	if idStr == "" {
		idStr = c.Params("id")
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid registration ID"})
	}

	tt, err := h.service.GetTournamentTeam(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if tt == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Registration not found"})
	}
	return c.JSON(tt)
}

func (h *RegistrationHandler) RegisterTeam(c *fiber.Ctx) error {
	var tt model.TournamentTeam
	if err := c.BodyParser(&tt); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	if tIDStr := c.Params("id"); tIDStr != "" {
		if tID, err := uuid.Parse(tIDStr); err == nil {
			tt.TournamentID = tID
		}
	}

	if tt.PaymentStatus == "" {
		tt.PaymentStatus = model.PaymentStatusPending
	}
	if tt.RegistrationStatus == "" {
		tt.RegistrationStatus = model.RegistrationStatusPending
	}
	if tt.RosterStatus == "" {
		tt.RosterStatus = model.RegistrationStatusPending
	}

	if err := h.service.RegisterTeam(c.Context(), &tt); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(tt)
}

func (h *RegistrationHandler) UpdateStatus(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("regId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid registration ID"})
	}

	var req struct {
		PaymentStatus      string `json:"payment_status"`
		RegistrationStatus string `json:"registration_status"`
		RosterStatus       string `json:"roster_status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	if err := h.service.UpdateStatus(c.Context(), id, req.PaymentStatus, req.RegistrationStatus, req.RosterStatus); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Registration status updated successfully"})
}

func (h *RegistrationHandler) WithdrawTournamentTeam(c *fiber.Ctx) error {
	idStr := c.Params("regId")
	if idStr == "" {
		idStr = c.Params("id")
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid registration ID"})
	}

	if err := h.service.WithdrawTournamentTeam(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Team withdrawn successfully", "success": true})
}

func (h *RegistrationHandler) RequestUnlock(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("regId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid registration ID"})
	}

	var req struct {
		Remark string `json:"remark"`
	}
	_ = c.BodyParser(&req)

	if err := h.service.RequestUnlock(c.Context(), id, req.Remark); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Unlock request submitted successfully"})
}

func (h *RegistrationHandler) ApproveUnlock(c *fiber.Ctx) error {
	idStr := c.Params("regId")
	if idStr == "" {
		idStr = c.Params("id")
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid registration ID"})
	}

	if err := h.service.ApproveUnlock(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Unlock request approved and roster unlocked"})
}

func (h *RegistrationHandler) RejectUnlock(c *fiber.Ctx) error {
	idStr := c.Params("regId")
	if idStr == "" {
		idStr = c.Params("id")
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid registration ID"})
	}

	if err := h.service.RejectUnlock(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Unlock request rejected successfully"})
}

func (h *RegistrationHandler) LockRoster(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("regId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid registration ID"})
	}

	var req struct {
		IsLocked bool `json:"is_locked"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	if err := h.service.LockRoster(c.Context(), id, req.IsLocked); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Roster lock status updated"})
}

// Roster Submissions
func (h *RegistrationHandler) GetRoster(c *fiber.Ctx) error {
	idStr := c.Params("regId")
	if idStr == "" {
		idStr = c.Params("id")
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid registration ID"})
	}

	list, err := h.service.GetRosterSubmissions(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if list == nil {
		list = []*model.TournamentRosterSubmission{}
	}
	return c.JSON(list)
}

func (h *RegistrationHandler) AddRosterSubmission(c *fiber.Ctx) error {
	idStr := c.Params("regId")
	if idStr == "" {
		idStr = c.Params("id")
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid registration ID"})
	}

	var s model.TournamentRosterSubmission
	if err := c.BodyParser(&s); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}
	s.TournamentTeamID = id

	if err := h.service.AddRosterSubmission(c.Context(), &s); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(s)
}

func (h *RegistrationHandler) DeleteRosterSubmission(c *fiber.Ctx) error {
	subID, err := uuid.Parse(c.Params("subId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid submission ID"})
	}

	if err := h.service.DeleteRosterSubmission(c.Context(), subID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Roster player removed successfully"})
}

// Tournament Players
func (h *RegistrationHandler) GetTournamentPlayers(c *fiber.Ctx) error {
	idParam := c.Params("regId")
	if idParam == "" {
		idParam = c.Params("teamId")
	}
	id, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament team ID"})
	}

	list, err := h.service.GetTournamentPlayers(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if list == nil {
		list = []*model.TournamentPlayer{}
	}
	return c.JSON(list)
}

func (h *RegistrationHandler) GetPlayersByTournament(c *fiber.Ctx) error {
	tID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament ID"})
	}

	var categoryID *uuid.UUID
	catParam := c.Query("category_id")
	if catParam != "" {
		if parsed, err := uuid.Parse(catParam); err == nil {
			categoryID = &parsed
		}
	}

	list, err := h.service.GetPlayersByTournament(c.Context(), tID, categoryID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if list == nil {
		list = []*model.TournamentPlayer{}
	}
	return c.JSON(list)
}

func (h *RegistrationHandler) AddTournamentPlayer(c *fiber.Ctx) error {
	idParam := c.Params("regId")
	if idParam == "" {
		idParam = c.Params("teamId")
	}
	id, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament team ID"})
	}

	var req service.AddTournamentPlayerInput
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	tp, err := h.service.AddTournamentPlayer(c.Context(), id, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(tp)
}

func (h *RegistrationHandler) UpdateTournamentPlayer(c *fiber.Ctx) error {
	playerID, err := uuid.Parse(c.Params("playerId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid player ID"})
	}

	var req struct {
		ShirtNumber *string `json:"shirt_number"`
		Position    *string `json:"position"`
		FirstName   *string `json:"first_name"`
		LastName    *string `json:"last_name"`
		Name        *string `json:"name"`
		PhotoURL    *string `json:"photo_url"`
		Tel         *string `json:"tel"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	if err := h.service.UpdateTournamentPlayer(c.Context(), playerID, req.ShirtNumber, req.Position, req.FirstName, req.LastName, req.Name, req.PhotoURL, req.Tel); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Tournament player updated successfully"})
}

func (h *RegistrationHandler) DeleteTournamentPlayer(c *fiber.Ctx) error {
	playerID, err := uuid.Parse(c.Params("playerId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid player ID"})
	}

	if err := h.service.DeleteTournamentPlayer(c.Context(), playerID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Tournament player removed successfully"})
}

func (h *RegistrationHandler) ListMyRegistrations(c *fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	list, err := h.service.ListMyRegistrations(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if list == nil {
		list = []*model.MyRegistrationItem{}
	}
	return c.JSON(list)
}

func (h *RegistrationHandler) ListIncomingTournamentActions(c *fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	list, err := h.service.ListIncomingTournamentActions(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if list == nil {
		list = []*model.IncomingTournamentActionItem{}
	}
	return c.JSON(list)
}

func (h *RegistrationHandler) ApproveRoster(c *fiber.Ctx) error {
	idStr := c.Params("regId")
	if idStr == "" {
		idStr = c.Params("id")
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid registration ID"})
	}

	if err := h.service.ApproveRoster(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Roster approved successfully"})
}

func (h *RegistrationHandler) RejectRoster(c *fiber.Ctx) error {
	idStr := c.Params("regId")
	if idStr == "" {
		idStr = c.Params("id")
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid registration ID"})
	}

	if err := h.service.RejectRoster(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Roster rejected successfully"})
}

func (h *RegistrationHandler) ApproveRosterSubmission(c *fiber.Ctx) error {
	idStr := c.Params("subId")
	if idStr == "" {
		idStr = c.Params("id")
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid submission ID"})
	}

	if err := h.service.ApproveSingleRosterSubmission(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Player approved successfully"})
}

func (h *RegistrationHandler) RejectRosterSubmission(c *fiber.Ctx) error {
	idStr := c.Params("subId")
	if idStr == "" {
		idStr = c.Params("id")
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid submission ID"})
	}

	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.BodyParser(&req)

	if err := h.service.RejectSingleRosterSubmission(c.Context(), id, req.Reason); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Player rejected successfully"})
}

func (h *RegistrationHandler) BatchApproveRosterSubmissions(c *fiber.Ctx) error {
	idStr := c.Params("regId")
	if idStr == "" {
		idStr = c.Params("id")
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid registration ID"})
	}

	var req struct {
		SubmissionIDs []string `json:"submission_ids"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	var parsedUUIDs []uuid.UUID
	for _, sID := range req.SubmissionIDs {
		if u, err := uuid.Parse(sID); err == nil {
			parsedUUIDs = append(parsedUUIDs, u)
		}
	}

	if err := h.service.BatchApproveRosterSubmissions(c.Context(), id, parsedUUIDs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Selected players approved successfully"})
}


