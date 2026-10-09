package service

import (
	"context"

	"github.com/google/uuid"

	"leagueflow-backend/internal/model"
	"leagueflow-backend/internal/repository"
)

type MasterPlayerService struct {
	repo *repository.MasterPlayerRepository
}

func NewMasterPlayerService(repo *repository.MasterPlayerRepository) *MasterPlayerService {
	return &MasterPlayerService{repo: repo}
}

func (s *MasterPlayerService) List(ctx context.Context, userID *uuid.UUID, search string) ([]*model.MasterPlayer, error) {
	return s.repo.List(ctx, userID, search)
}

func (s *MasterPlayerService) GetByID(ctx context.Context, id uuid.UUID) (*model.MasterPlayer, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *MasterPlayerService) Create(ctx context.Context, p *model.MasterPlayer) error {
	return s.repo.Create(ctx, p)
}

func (s *MasterPlayerService) Update(ctx context.Context, p *model.MasterPlayer) error {
	return s.repo.Update(ctx, p)
}

func (s *MasterPlayerService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}
