package service

import (
	"context"

	"github.com/google/uuid"

	"leagueflow-backend/internal/model"
	"leagueflow-backend/internal/repository"
)

type RegistrationService struct {
	repo             *repository.RegistrationRepository
	masterPlayerRepo *repository.MasterPlayerRepository
}

func NewRegistrationService(repo *repository.RegistrationRepository, masterPlayerRepo *repository.MasterPlayerRepository) *RegistrationService {
	return &RegistrationService{
		repo:             repo,
		masterPlayerRepo: masterPlayerRepo,
	}
}

func (s *RegistrationService) ListTournamentTeams(ctx context.Context, tournamentID *uuid.UUID, categoryID *uuid.UUID) ([]*model.TournamentTeam, error) {
	return s.repo.ListTournamentTeams(ctx, tournamentID, categoryID)
}

func (s *RegistrationService) GetTournamentTeam(ctx context.Context, id uuid.UUID) (*model.TournamentTeam, error) {
	return s.repo.GetTournamentTeam(ctx, id)
}

func (s *RegistrationService) RegisterTeam(ctx context.Context, tt *model.TournamentTeam) error {
	return s.repo.RegisterTeam(ctx, tt)
}

func (s *RegistrationService) UpdateStatus(ctx context.Context, id uuid.UUID, paymentStatus, registrationStatus, rosterStatus string) error {
	return s.repo.UpdateTournamentTeamStatus(ctx, id, paymentStatus, registrationStatus, rosterStatus)
}

func (s *RegistrationService) WithdrawTournamentTeam(ctx context.Context, id uuid.UUID) error {
	return s.repo.WithdrawTournamentTeam(ctx, id)
}

func (s *RegistrationService) RequestUnlock(ctx context.Context, id uuid.UUID, remark string) error {
	return s.repo.RequestUnlock(ctx, id, remark)
}

func (s *RegistrationService) ApproveUnlock(ctx context.Context, id uuid.UUID) error {
	return s.repo.ApproveUnlock(ctx, id)
}

func (s *RegistrationService) LockRoster(ctx context.Context, id uuid.UUID, locked bool) error {
	return s.repo.LockRoster(ctx, id, locked)
}

func (s *RegistrationService) GetRosterSubmissions(ctx context.Context, tournamentTeamID uuid.UUID) ([]*model.TournamentRosterSubmission, error) {
	return s.repo.GetRosterSubmissions(ctx, tournamentTeamID)
}

func (s *RegistrationService) AddRosterSubmission(ctx context.Context, sub *model.TournamentRosterSubmission) error {
	return s.repo.AddRosterSubmission(ctx, sub)
}

func (s *RegistrationService) DeleteRosterSubmission(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteRosterSubmission(ctx, id)
}

func (s *RegistrationService) GetTournamentPlayers(ctx context.Context, tournamentTeamID uuid.UUID) ([]*model.TournamentPlayer, error) {
	return s.repo.GetTournamentPlayers(ctx, tournamentTeamID)
}

type AddTournamentPlayerInput struct {
	MasterPlayerID *uuid.UUID `json:"master_player_id"`
	FirstName      string     `json:"first_name"`
	LastName       string     `json:"last_name"`
	ShirtNumber    *string    `json:"shirt_number"`
	Position       *string    `json:"position"`
	PhotoURL       *string    `json:"photo_url"`
	Tel            *string    `json:"tel"`
	DateOfBirth    *string    `json:"date_of_birth"`
}

func (s *RegistrationService) AddTournamentPlayer(ctx context.Context, tournamentTeamID uuid.UUID, input *AddTournamentPlayerInput) (*model.TournamentPlayer, error) {
	var masterID uuid.UUID

	if input.MasterPlayerID != nil && *input.MasterPlayerID != uuid.Nil {
		masterID = *input.MasterPlayerID
		if s.masterPlayerRepo != nil && ((input.PhotoURL != nil && *input.PhotoURL != "") || (input.Tel != nil && *input.Tel != "")) {
			if mp, err := s.masterPlayerRepo.GetByID(ctx, masterID); err == nil && mp != nil {
				if input.PhotoURL != nil && *input.PhotoURL != "" {
					mp.PhotoURL = input.PhotoURL
				}
				if input.Tel != nil && *input.Tel != "" {
					mp.Tel = input.Tel
				}
				_ = s.masterPlayerRepo.Update(ctx, mp)
			}
		}
	} else if s.masterPlayerRepo != nil {
		// Look up or create master player
		mp, err := s.masterPlayerRepo.FindByName(ctx, input.FirstName, input.LastName)
		if err == nil && mp != nil {
			masterID = mp.ID
			if input.PhotoURL != nil && *input.PhotoURL != "" {
				mp.PhotoURL = input.PhotoURL
				_ = s.masterPlayerRepo.Update(ctx, mp)
			}
		} else {
			var firstLocal, lastLocal, firstIntl, lastIntl *string
			if isASCII(input.FirstName) && (input.LastName == "" || isASCII(input.LastName)) {
				firstIntl = &input.FirstName
				lastIntl = &input.LastName
			} else {
				firstLocal = &input.FirstName
				lastLocal = &input.LastName
			}

			newMP := &model.MasterPlayer{
				FirstNameLocal: firstLocal,
				LastNameLocal:  lastLocal,
				FirstNameIntl:  firstIntl,
				LastNameIntl:   lastIntl,
				Birthday:       input.DateOfBirth,
				PhotoURL:       input.PhotoURL,
				Tel:            input.Tel,
			}
			if err := s.masterPlayerRepo.Create(ctx, newMP); err != nil {
				return nil, err
			}
			masterID = newMP.ID
		}
	}

	tp := &model.TournamentPlayer{
		TournamentTeamID: tournamentTeamID,
		MasterPlayerID:   masterID,
		ShirtNumber:      input.ShirtNumber,
		Position:         input.Position,
	}

	if err := s.repo.AddTournamentPlayer(ctx, tp); err != nil {
		return nil, err
	}

	if s.masterPlayerRepo != nil {
		tp.MasterPlayer, _ = s.masterPlayerRepo.GetByID(ctx, masterID)
	}

	return tp, nil
}

func (s *RegistrationService) UpdateTournamentPlayer(ctx context.Context, id uuid.UUID, shirtNumber, position, firstName, lastName, name, photoURL, tel *string) error {
	if err := s.repo.UpdateTournamentPlayer(ctx, id, shirtNumber, position); err != nil {
		return err
	}
	if s.masterPlayerRepo != nil {
		masterID, err := s.repo.GetTournamentPlayerMasterID(ctx, id)
		if err == nil && masterID != nil {
			if mp, err := s.masterPlayerRepo.GetByID(ctx, *masterID); err == nil && mp != nil {
				if firstName != nil && *firstName != "" {
					if isASCII(*firstName) && (lastName == nil || isASCII(*lastName)) {
						mp.FirstNameIntl = firstName
						if lastName != nil && *lastName != "" {
							mp.LastNameIntl = lastName
						}
					} else {
						mp.FirstNameLocal = firstName
						if lastName != nil && *lastName != "" {
							mp.LastNameLocal = lastName
						}
					}
				}
				if name != nil && *name != "" && (firstName == nil || *firstName == "") {
					mp.Name = *name
				}
				if photoURL != nil && *photoURL != "" {
					mp.PhotoURL = photoURL
				}
				if tel != nil && *tel != "" {
					mp.Tel = tel
				}
				_ = s.masterPlayerRepo.Update(ctx, mp)
			}
		}
	}
	return nil
}

func (s *RegistrationService) DeleteTournamentPlayer(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteTournamentPlayer(ctx, id)
}

func (s *RegistrationService) ListMyRegistrations(ctx context.Context, userID uuid.UUID) ([]*model.MyRegistrationItem, error) {
	return s.repo.ListMyRegistrations(ctx, userID)
}

func (s *RegistrationService) ListIncomingTournamentActions(ctx context.Context, userID uuid.UUID) ([]*model.IncomingTournamentActionItem, error) {
	return s.repo.ListIncomingTournamentActions(ctx, userID)
}

func (s *RegistrationService) ApproveRoster(ctx context.Context, tournamentTeamID uuid.UUID) error {
	return s.repo.ApproveRoster(ctx, tournamentTeamID)
}

func (s *RegistrationService) RejectRoster(ctx context.Context, tournamentTeamID uuid.UUID) error {
	return s.repo.RejectRoster(ctx, tournamentTeamID)
}

func (s *RegistrationService) ApproveSingleRosterSubmission(ctx context.Context, submissionID uuid.UUID) error {
	return s.repo.ApproveSingleRosterSubmission(ctx, submissionID)
}

func (s *RegistrationService) RejectSingleRosterSubmission(ctx context.Context, submissionID uuid.UUID, reason string) error {
	return s.repo.RejectSingleRosterSubmission(ctx, submissionID, reason)
}

func (s *RegistrationService) BatchApproveRosterSubmissions(ctx context.Context, tournamentTeamID uuid.UUID, submissionIDs []uuid.UUID) error {
	return s.repo.BatchApproveRosterSubmissions(ctx, tournamentTeamID, submissionIDs)
}


