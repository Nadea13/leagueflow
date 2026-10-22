package service

import (
	"context"

	"github.com/google/uuid"

	"leagueflow-backend/internal/model"
	"leagueflow-backend/internal/repository"
)

type ExtraService struct {
	repo *repository.ExtraRepository
}

func NewExtraService(repo *repository.ExtraRepository) *ExtraService {
	return &ExtraService{repo: repo}
}

// Sports & Age Categories
func (s *ExtraService) ListSports(ctx context.Context) ([]*model.Sport, error) {
	return s.repo.ListSports(ctx)
}

func (s *ExtraService) ListAgeCategories(ctx context.Context) ([]*model.AgeCategory, error) {
	return s.repo.ListAgeCategories(ctx)
}

func (s *ExtraService) GetOrCreateAgeCategory(ctx context.Context, name string, minAge, maxAge *int) (*model.AgeCategory, error) {
	return s.repo.GetOrCreateAgeCategory(ctx, name, minAge, maxAge)
}

// Sponsors
func (s *ExtraService) ListSponsors(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentSponsor, error) {
	return s.repo.ListSponsors(ctx, tournamentID)
}

func (s *ExtraService) CreateSponsor(ctx context.Context, sponsor *model.TournamentSponsor) error {
	return s.repo.CreateSponsor(ctx, sponsor)
}

func (s *ExtraService) UpdateSponsor(ctx context.Context, sponsor *model.TournamentSponsor) error {
	return s.repo.UpdateSponsor(ctx, sponsor)
}

func (s *ExtraService) DeleteSponsor(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteSponsor(ctx, id)
}

// Announcements
func (s *ExtraService) ListAnnouncements(ctx context.Context, tournamentID uuid.UUID) ([]*model.Announcement, error) {
	return s.repo.ListAnnouncements(ctx, tournamentID)
}

func (s *ExtraService) CreateAnnouncement(ctx context.Context, a *model.Announcement) error {
	return s.repo.CreateAnnouncement(ctx, a)
}

func (s *ExtraService) DeleteAnnouncement(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteAnnouncement(ctx, id)
}

func (s *ExtraService) UpdateAnnouncement(ctx context.Context, id uuid.UUID, title, content *string, isPinned *bool) error {
	return s.repo.UpdateAnnouncement(ctx, id, title, content, isPinned)
}

// Invitations
func (s *ExtraService) ListInvitations(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentInvitation, error) {
	return s.repo.ListInvitations(ctx, tournamentID)
}

func (s *ExtraService) CreateInvitation(ctx context.Context, inv *model.TournamentInvitation) error {
	return s.repo.CreateInvitation(ctx, inv)
}

func (s *ExtraService) UpdateInvitationRole(ctx context.Context, id uuid.UUID, role string) error {
	return s.repo.UpdateInvitationRole(ctx, id, role)
}

func (s *ExtraService) DeleteInvitation(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteInvitation(ctx, id)
}

func (s *ExtraService) ListMyInvitations(ctx context.Context, userID uuid.UUID, email string) ([]*model.UserInvitationItem, error) {
	return s.repo.ListMyInvitations(ctx, userID, email)
}

func (s *ExtraService) AcceptInvitation(ctx context.Context, tournamentID uuid.UUID, userID uuid.UUID, email string) error {
	return s.repo.AcceptInvitation(ctx, tournamentID, userID, email)
}

func (s *ExtraService) RejectInvitation(ctx context.Context, tournamentID uuid.UUID, userID uuid.UUID, email string) error {
	return s.repo.RejectInvitation(ctx, tournamentID, userID, email)
}

// Payments
func (s *ExtraService) ListPayments(ctx context.Context, userID *uuid.UUID, tournamentID *uuid.UUID) ([]*model.Payment, error) {
	return s.repo.ListPayments(ctx, userID, tournamentID)
}

func (s *ExtraService) CreatePayment(ctx context.Context, p *model.Payment) error {
	return s.repo.CreatePayment(ctx, p)
}

// Table Statistics
func (s *ExtraService) GetTableCounts(ctx context.Context) (*model.TableStats, error) {
	return s.repo.GetTableCounts(ctx)
}

func (s *ExtraService) GetTablePreview(ctx context.Context, table string) ([]map[string]interface{}, error) {
	return s.repo.GetTablePreview(ctx, table)
}
