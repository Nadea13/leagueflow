package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"leagueflow-backend/internal/model"
	"leagueflow-backend/internal/service"
)

type ExtraHandler struct {
	service *service.ExtraService
}

func NewExtraHandler(service *service.ExtraService) *ExtraHandler {
	return &ExtraHandler{service: service}
}

// Sports
func (h *ExtraHandler) ListSports(c *fiber.Ctx) error {
	sports, err := h.service.ListSports(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if sports == nil {
		sports = []*model.Sport{}
	}
	return c.JSON(sports)
}

// Age Categories
func (h *ExtraHandler) ListAgeCategories(c *fiber.Ctx) error {
	list, err := h.service.ListAgeCategories(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if list == nil {
		list = []*model.AgeCategory{}
	}
	return c.JSON(list)
}

func (h *ExtraHandler) CreateAgeCategory(c *fiber.Ctx) error {
	var input struct {
		CategoryName string `json:"category_name"`
		Name         string `json:"name"`
		MinAge       *int   `json:"min_age,omitempty"`
		MaxAge       *int   `json:"max_age,omitempty"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	name := input.CategoryName
	if name == "" {
		name = input.Name
	}
	if name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "category_name is required"})
	}

	ac, err := h.service.GetOrCreateAgeCategory(c.Context(), name, input.MinAge, input.MaxAge)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(ac)
}

// Sponsors
func (h *ExtraHandler) ListSponsors(c *fiber.Ctx) error {
	tID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament ID"})
	}

	sponsors, err := h.service.ListSponsors(c.Context(), tID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if sponsors == nil {
		sponsors = []*model.TournamentSponsor{}
	}
	return c.JSON(sponsors)
}

func (h *ExtraHandler) CreateSponsor(c *fiber.Ctx) error {
	tID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament ID"})
	}

	var s model.TournamentSponsor
	if err := c.BodyParser(&s); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}
	s.TournamentID = tID

	if err := h.service.CreateSponsor(c.Context(), &s); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(s)
}

func (h *ExtraHandler) UpdateSponsor(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("sponsorId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid sponsor ID"})
	}

	var s model.TournamentSponsor
	if err := c.BodyParser(&s); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}
	s.ID = id

	if err := h.service.UpdateSponsor(c.Context(), &s); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(s)
}

func (h *ExtraHandler) DeleteSponsor(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("sponsorId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid sponsor ID"})
	}

	if err := h.service.DeleteSponsor(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Sponsor deleted successfully"})
}

// Announcements
func (h *ExtraHandler) ListAnnouncements(c *fiber.Ctx) error {
	tID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament ID"})
	}

	list, err := h.service.ListAnnouncements(c.Context(), tID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if list == nil {
		list = []*model.Announcement{}
	}
	return c.JSON(list)
}

func (h *ExtraHandler) CreateAnnouncement(c *fiber.Ctx) error {
	tID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament ID"})
	}

	var a model.Announcement
	if err := c.BodyParser(&a); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}
	a.TournamentID = tID

	if err := h.service.CreateAnnouncement(c.Context(), &a); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(a)
}

func (h *ExtraHandler) DeleteAnnouncement(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("announcementId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid announcement ID"})
	}

	if err := h.service.DeleteAnnouncement(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Announcement deleted successfully"})
}

func (h *ExtraHandler) UpdateAnnouncement(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("announcementId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid announcement ID"})
	}

	var req struct {
		Title    *string `json:"title"`
		Content  *string `json:"content"`
		IsPinned *bool   `json:"is_pinned"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	if err := h.service.UpdateAnnouncement(c.Context(), id, req.Title, req.Content, req.IsPinned); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Announcement updated successfully"})
}

// Invitations
func (h *ExtraHandler) ListInvitations(c *fiber.Ctx) error {
	tID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament ID"})
	}

	list, err := h.service.ListInvitations(c.Context(), tID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if list == nil {
		list = []*model.TournamentInvitation{}
	}
	return c.JSON(list)
}

func (h *ExtraHandler) CreateInvitation(c *fiber.Ctx) error {
	tID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament ID"})
	}

	var inv model.TournamentInvitation
	if err := c.BodyParser(&inv); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}
	inv.TournamentID = tID

	if err := h.service.CreateInvitation(c.Context(), &inv); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(inv)
}

func (h *ExtraHandler) UpdateInvitation(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("invitationId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid invitation ID"})
	}

	var payload struct {
		Role string `json:"role"`
	}
	if err := c.BodyParser(&payload); err != nil || payload.Role == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	if err := h.service.UpdateInvitationRole(c.Context(), id, payload.Role); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Invitation role updated successfully", "role": payload.Role})
}

func (h *ExtraHandler) DeleteInvitation(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("invitationId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid invitation ID"})
	}

	if err := h.service.DeleteInvitation(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Invitation deleted successfully"})
}

func (h *ExtraHandler) ListMyInvitations(c *fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Authentication required"})
	}
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user session"})
	}

	email, _ := c.Locals("email").(string)

	list, err := h.service.ListMyInvitations(c.Context(), userID, email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if list == nil {
		list = []*model.UserInvitationItem{}
	}
	return c.JSON(list)
}

func (h *ExtraHandler) AcceptInvitation(c *fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Authentication required"})
	}
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user session"})
	}

	email, _ := c.Locals("email").(string)

	tournamentID, err := uuid.Parse(c.Params("tournamentId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament ID"})
	}

	if err := h.service.AcceptInvitation(c.Context(), tournamentID, userID, email); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Invitation accepted successfully"})
}

func (h *ExtraHandler) RejectInvitation(c *fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Authentication required"})
	}
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user session"})
	}

	email, _ := c.Locals("email").(string)

	tournamentID, err := uuid.Parse(c.Params("tournamentId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tournament ID"})
	}

	if err := h.service.RejectInvitation(c.Context(), tournamentID, userID, email); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Invitation rejected successfully"})
}

// Payments
func (h *ExtraHandler) ListPayments(c *fiber.Ctx) error {
	var uIDPtr, tIDPtr *uuid.UUID
	if uIDStr := c.Query("user_id"); uIDStr != "" {
		if uID, err := uuid.Parse(uIDStr); err == nil {
			uIDPtr = &uID
		}
	}
	if tIDStr := c.Query("tournament_id"); tIDStr != "" {
		if tID, err := uuid.Parse(tIDStr); err == nil {
			tIDPtr = &tID
		}
	}

	list, err := h.service.ListPayments(c.Context(), uIDPtr, tIDPtr)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if list == nil {
		list = []*model.Payment{}
	}
	return c.JSON(list)
}

func (h *ExtraHandler) CreatePayment(c *fiber.Ctx) error {
	var p model.Payment
	if err := c.BodyParser(&p); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	if userIDVal := c.Locals("user_id"); userIDVal != nil {
		if uID, ok := userIDVal.(uuid.UUID); ok && p.UserID == nil {
			p.UserID = &uID
		}
	}

	if p.PaymentStatus == "" {
		p.PaymentStatus = "completed"
	}

	if err := h.service.CreatePayment(c.Context(), &p); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(p)
}

func (h *ExtraHandler) GetTableCounts(c *fiber.Ctx) error {
	stats, err := h.service.GetTableCounts(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stats)
}

func (h *ExtraHandler) GetTablePreview(c *fiber.Ctx) error {
	table := c.Query("table")
	if table == "" {
		table = c.Params("table")
	}
	if table == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "table parameter is required"})
	}

	results, err := h.service.GetTablePreview(c.Context(), table)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(results)
}
