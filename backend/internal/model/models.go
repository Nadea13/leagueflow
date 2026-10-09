package model

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleSuperAdmin UserRole = "super_admin"
	RoleOrganizer  UserRole = "organizer"
	RoleStaff      UserRole = "staff"
	RolePlayer     UserRole = "player"
	RoleUser       UserRole = "user"
)

type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	AvatarURL    *string   `json:"avatar_url,omitempty"`
	Role         UserRole  `json:"role"`
	Phone        *string   `json:"phone,omitempty"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type TournamentFormat string

const (
	FormatSingleElimination  TournamentFormat = "single_elimination"
	FormatDoubleElimination  TournamentFormat = "double_elimination"
	FormatRoundRobin         TournamentFormat = "round_robin"
	FormatGroupStageKnockout TournamentFormat = "group_stage_knockout"
	FormatCustom             TournamentFormat = "custom"
)

type TournamentStatus string

const (
	StatusDraft              TournamentStatus = "draft"
	StatusPublished          TournamentStatus = "published"
	StatusRegistrationOpen   TournamentStatus = "registration_open"
	StatusRegistrationClosed TournamentStatus = "registration_closed"
	StatusOngoing            TournamentStatus = "ongoing"
	StatusCompleted          TournamentStatus = "completed"
	StatusCancelled          TournamentStatus = "cancelled"
)

type SportType string

const (
	SportTypeTeam       SportType = "team"
	SportTypeRacket     SportType = "racket"
	SportTypeIndividual SportType = "individual"
	SportTypeDual       SportType = "dual"
	SportTypeCombat     SportType = "combat"
	SportTypeEsports    SportType = "esports"
)

type Sport struct {
	ID        int        `json:"id"`
	SportName string     `json:"sport_name"`
	SportType SportType  `json:"sport_type"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}

type AgeCategory struct {
	ID           int    `json:"id"`
	CategoryName string `json:"category_name"`
	MinAge       *int   `json:"min_age,omitempty"`
	MaxAge       *int   `json:"max_age,omitempty"`
}

type Tournament struct {
	ID                 uuid.UUID              `json:"id"`
	OrganizerID        uuid.UUID              `json:"organizer_id"`
	SportID            *int                   `json:"sport_id,omitempty"`
	Name               string                 `json:"name"`
	Slug               string                 `json:"slug"`
	Description        *string                `json:"description,omitempty"`
	Format             TournamentFormat       `json:"format"`
	Status             TournamentStatus       `json:"status"`
	StartDate          string                 `json:"start_date"`
	EndDate            string                 `json:"end_date"`
	Location           *string                `json:"location,omitempty"`
	GoogleMapURL       *string                `json:"google_map_url,omitempty"`
	BannerURL          *string                `json:"banner_url,omitempty"`
	LogoURL            *string                `json:"logo_url,omitempty"`
	Rules              *string                `json:"rules,omitempty"`
	RegistrationOpen   *time.Time             `json:"registration_open,omitempty"`
	RegistrationClosed *time.Time             `json:"registration_closed,omitempty"`
	DocumentDeadline   *time.Time             `json:"document_deadline,omitempty"`
	IsPublic           bool                   `json:"is_public"`
	SportName          string                 `json:"sport_name,omitempty"`
	TeamsCount         int                    `json:"teams_count"`
	MaxTeams           int                    `json:"max_teams"`
	DocDeadlineStr     *string                `json:"document_deadline_str,omitempty"`
	Settings           map[string]interface{} `json:"settings"`
	CreatedAt          time.Time              `json:"created_at"`
	UpdatedAt          time.Time              `json:"updated_at"`
}

type TournamentCategory struct {
	ID              uuid.UUID              `json:"id"`
	TournamentID    uuid.UUID              `json:"tournament_id"`
	Name            string                 `json:"name"`
	TeamLimit       int                    `json:"team_limit"`
	AgeCategoryID   *int                   `json:"age_category_id,omitempty"`
	GenderType      string                 `json:"gender_type"`
	MaxTeams        int                    `json:"max_teams"`
	RegistrationFee float64                `json:"registration_fee"`
	CanvasData      map[string]interface{} `json:"canvas_data"`
	RulesConfig     map[string]interface{} `json:"rules_config"`
	AgeCategories   *AgeCategory           `json:"age_categories,omitempty"`
	CategoryName    string                 `json:"category_name,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

type Team struct {
	ID             uuid.UUID              `json:"id"`
	UserID         *uuid.UUID             `json:"user_id,omitempty"`
	SportID        *int                   `json:"sport_id,omitempty"`
	Name           string                 `json:"name"`
	ShortName      *string                `json:"short_name,omitempty"`
	Description    *string                `json:"description,omitempty"`
	LogoURL        *string                `json:"logo_url,omitempty"`
	LogoImg        *string                `json:"logo_img,omitempty"`
	ContactName    *string                `json:"contact_name,omitempty"`
	ContactPhone   *string                `json:"contact_phone,omitempty"`
	ContactEmail   *string                `json:"contact_email,omitempty"`
	IsRosterLocked bool                   `json:"is_roster_locked"`
	CreatedBy      *uuid.UUID             `json:"created_by,omitempty"`
	Sport          string                 `json:"sport,omitempty"`
	ContactInfo    map[string]interface{} `json:"contact_info"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
}

type PaymentStatus string

const (
	PaymentStatusPending  PaymentStatus = "pending"
	PaymentStatusChecking PaymentStatus = "checking"
	PaymentStatusPaid     PaymentStatus = "paid"
	PaymentStatusRejected PaymentStatus = "rejected"
)

type RegistrationStatus string

const (
	RegistrationStatusPending  RegistrationStatus = "pending"
	RegistrationStatusApproved RegistrationStatus = "approved"
	RegistrationStatusRejected RegistrationStatus = "rejected"
)

type TournamentTeam struct {
	ID                   uuid.UUID          `json:"id"`
	TournamentID         uuid.UUID          `json:"tournament_id"`
	CategoryID           uuid.UUID          `json:"category_id"`
	TournamentCategoryID uuid.UUID          `json:"tournament_category_id"`
	TeamID               uuid.UUID          `json:"team_id"`
	Team                 *Team              `json:"team,omitempty"`
	PaymentStatus        PaymentStatus      `json:"payment_status"`
	RegistrationStatus   RegistrationStatus `json:"registration_status"`
	RosterStatus         RegistrationStatus `json:"roster_status"`
	IsRosterLocked       bool               `json:"is_roster_locked"`
	UnlockRequested      bool               `json:"unlock_requested"`
	SlipImg              *string            `json:"slip_img,omitempty"`
	ContactName          *string            `json:"contact_name,omitempty"`
	ContactPhone         *string            `json:"contact_phone,omitempty"`
	ContactEmail         *string            `json:"contact_email,omitempty"`
	Remark               *string            `json:"remark,omitempty"`
	SeedNumber           *int               `json:"seed_number,omitempty"`
	GroupName            *string            `json:"group_name,omitempty"`
	CreatedAt            time.Time          `json:"created_at"`
	UpdatedAt            *time.Time         `json:"updated_at,omitempty"`
}

type MasterPlayer struct {
	ID              uuid.UUID  `json:"id"`
	UserID          *uuid.UUID `json:"user_id,omitempty"`
	Name            string     `json:"name"`
	FirstNameLocal  *string    `json:"first_name_local,omitempty"`
	MiddleNameLocal *string    `json:"middle_name_local,omitempty"`
	LastNameLocal   *string    `json:"last_name_local,omitempty"`
	FirstNameIntl   *string    `json:"first_name_intl,omitempty"`
	MiddleNameIntl  *string    `json:"middle_name_intl,omitempty"`
	LastNameIntl    *string    `json:"last_name_intl,omitempty"`
	Nickname        *string    `json:"nickname,omitempty"`
	Birthday        *string    `json:"birthday,omitempty"`
	PhotoURL        *string    `json:"photo_url,omitempty"`
	Tel             *string    `json:"tel,omitempty"`
	FavoriteSportID *int       `json:"favorite_sport_id,omitempty"`
	PreferredHand   *string    `json:"preferred_hand,omitempty"`
	PreferredFoot   *string    `json:"preferred_foot,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type Player struct {
	ID             uuid.UUID     `json:"id"`
	TeamID         uuid.UUID     `json:"team_id"`
	FirstName      string        `json:"first_name"`
	LastName       string        `json:"last_name"`
	JerseyNumber   *int          `json:"jersey_number,omitempty"`
	Position       *string       `json:"position,omitempty"`
	PhotoURL       *string       `json:"photo_url,omitempty"`
	DateOfBirth    *string       `json:"date_of_birth,omitempty"`
	MasterPlayerID *uuid.UUID    `json:"master_player_id,omitempty"`
	Tel            *string       `json:"tel,omitempty"`
	MasterPlayer   *MasterPlayer `json:"master_player,omitempty"`
	CreatedAt      time.Time     `json:"created_at"`
	UpdatedAt      time.Time     `json:"updated_at"`
}

type TournamentPlayer struct {
	ID               uuid.UUID     `json:"id"`
	TournamentTeamID uuid.UUID     `json:"tournament_team_id"`
	MasterPlayerID   uuid.UUID     `json:"master_player_id"`
	ShirtNumber      *string       `json:"shirt_number,omitempty"`
	Position         *string       `json:"position,omitempty"`
	MasterPlayer     *MasterPlayer `json:"master_player,omitempty"`
	CreatedAt        time.Time     `json:"created_at"`
	UpdatedAt        *time.Time    `json:"updated_at,omitempty"`
	DeletedAt        *time.Time    `json:"deleted_at,omitempty"`
}

type TournamentRosterSubmission struct {
	ID                 uuid.UUID  `json:"id"`
	TournamentTeamID   uuid.UUID  `json:"tournament_team_id"`
	MasterPlayerID     *uuid.UUID `json:"master_player_id,omitempty"`
	PlayerID           *uuid.UUID `json:"player_id,omitempty"`
	Name               string     `json:"name"`
	ShirtNumber        *string    `json:"shirt_number,omitempty"`
	Position           *string    `json:"position,omitempty"`
	Tel                *string    `json:"tel,omitempty"`
	PhotoURL           *string    `json:"photo_url,omitempty"`
	Status             string     `json:"status"`
	RejectionReason    *string    `json:"rejection_reason,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type TeamManagementRequest struct {
	ID           uuid.UUID  `json:"id"`
	TeamID       uuid.UUID  `json:"team_id"`
	RequesterID  uuid.UUID  `json:"requester_id"`
	ContactPhone string     `json:"contact_phone"`
	Message      *string    `json:"message,omitempty"`
	Status       string     `json:"status"`
	Team         *Team      `json:"team,omitempty"`
	Requester    *User      `json:"requester,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type MatchStatus string

const (
	MatchScheduled  MatchStatus = "scheduled"
	MatchLive       MatchStatus = "live"
	MatchFinished   MatchStatus = "finished"
	MatchCanceled   MatchStatus = "canceled"
	MatchWarmup     MatchStatus = "warmup"
	MatchFirstHalf  MatchStatus = "first_half"
	MatchHalfTime   MatchStatus = "half_time"
	MatchSecondHalf MatchStatus = "second_half"
	MatchExtraTime  MatchStatus = "extra_time"
	MatchPenalties  MatchStatus = "penalties"
	MatchCompleted  MatchStatus = "completed"
	MatchCancelled  MatchStatus = "cancelled"
	MatchPostponed  MatchStatus = "postponed"
)

type Match struct {
	ID                 uuid.UUID              `json:"id"`
	CategoryID         *uuid.UUID             `json:"category_id,omitempty"`
	HomeTeamID         *uuid.UUID             `json:"home_team_id,omitempty"`
	AwayTeamID         *uuid.UUID             `json:"away_team_id,omitempty"`
	HomeTeam           *Team                  `json:"home_team,omitempty"`
	AwayTeam           *Team                  `json:"away_team,omitempty"`
	HomeScore          int                    `json:"home_score"`
	AwayScore          int                    `json:"away_score"`
	ScoreDetail        map[string]interface{} `json:"score_detail,omitempty"`
	Status             MatchStatus            `json:"status"`
	TimerStatus        string                 `json:"timer_status"`
	ElapsedSeconds     int                    `json:"elapsed_seconds"`
	Minute             *int                   `json:"minute,omitempty"`
	ScheduledAt        *time.Time             `json:"scheduled_at,omitempty"`
	FieldName          *string                `json:"field_name,omitempty"`
	Round              int                    `json:"round"`
	Stage              string                 `json:"stage"`
	IsManual           bool                   `json:"is_manual"`
	IdxMatch           int                    `json:"idx_match"`
	NodeID             *string                `json:"node_id,omitempty"`
	NextNodeID         *string                `json:"next_node_id,omitempty"`
	PhHome             *string                `json:"ph_home,omitempty"`
	PhAway             *string                `json:"ph_away,omitempty"`
	// Aliases for compatibility
	TournamentCategoryID *uuid.UUID             `json:"tournament_category_id,omitempty"`
	MatchIndex           int                    `json:"match_index,omitempty"`
	WinnerToNodeID       *string                `json:"winner_to_node_id,omitempty"`
	PlaceholderHome      *string                `json:"placeholder_home,omitempty"`
	PlaceholderAway      *string                `json:"placeholder_away,omitempty"`
	PlaceholderA         *string                `json:"placeholder_a,omitempty"`
	PlaceholderB         *string                `json:"placeholder_b,omitempty"`
	ElapsedBeforePause   int                    `json:"elapsed_before_pause,omitempty"`
	CurrentMinute        *int                   `json:"current_minute,omitempty"`
	CreatedAt            time.Time              `json:"created_at"`
	UpdatedAt            time.Time              `json:"updated_at"`
	DeletedAt            *time.Time             `json:"deleted_at,omitempty"`
}

type MatchEvent struct {
	ID        uuid.UUID              `json:"id"`
	MatchID   uuid.UUID              `json:"match_id"`
	TeamID    *uuid.UUID             `json:"team_id,omitempty"`
	PlayerID  *uuid.UUID             `json:"player_id,omitempty"`
	Type      string                 `json:"type"`
	EventType string                 `json:"event_type,omitempty"` // Alias
	Minute    int                    `json:"minute"`
	Detail    map[string]interface{} `json:"detail,omitempty"`
	ExtraInfo map[string]interface{} `json:"extra_info,omitempty"` // Alias
	CreatedAt time.Time              `json:"created_at"`
	DeletedAt *time.Time             `json:"deleted_at,omitempty"`
}

type Standing struct {
	ID                   uuid.UUID `json:"id"`
	TournamentCategoryID uuid.UUID `json:"tournament_category_id"`
	GroupName            string    `json:"group_name"`
	NodeID               *string   `json:"node_id,omitempty"`
	TeamID               uuid.UUID `json:"team_id"`
	Team                 *Team     `json:"team,omitempty"`
	Played               int       `json:"played"`
	Won                  int       `json:"won"`
	Drawn                int       `json:"drawn"`
	Lost                 int       `json:"lost"`
	GoalsFor             int       `json:"goals_for"`
	GoalsAgainst         int       `json:"goals_against"`
	GoalDiff             int       `json:"goal_diff"`
	Points               int       `json:"points"`
	Rank                 int       `json:"rank"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type TournamentSponsor struct {
	ID           uuid.UUID `json:"id"`
	TournamentID uuid.UUID `json:"tournament_id"`
	SponsorName  string    `json:"sponsor_name"`
	LogoImg      string    `json:"logo_img"`
	CoverURL     *string   `json:"cover_url,omitempty"`
	LinkURL      *string   `json:"link_url,omitempty"`
	OrderIndex   int       `json:"order_index"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Announcement struct {
	ID           uuid.UUID `json:"id"`
	TournamentID uuid.UUID `json:"tournament_id"`
	Title        string    `json:"title"`
	Content      string    `json:"content"`
	IsPinned     bool      `json:"is_pinned"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type TournamentInvitation struct {
	ID           uuid.UUID  `json:"id"`
	TournamentID uuid.UUID  `json:"tournament_id"`
	UserID       *uuid.UUID `json:"user_id,omitempty"`
	Email        string     `json:"email"`
	Role         string     `json:"role"`
	Status       string     `json:"status"`
	AvatarURL    *string    `json:"avatar_url,omitempty"`
	FullName     *string    `json:"full_name,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type UserInvitationItem struct {
	ID             uuid.UUID `json:"id"`
	TournamentID   uuid.UUID `json:"tournament_id"`
	TournamentName string    `json:"tournament_name"`
	TournamentLogo *string   `json:"tournament_logo,omitempty"`
	Role           string    `json:"role"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
}

type Payment struct {
	ID                 uuid.UUID              `json:"id"`
	UserID             *uuid.UUID             `json:"user_id,omitempty"`
	TournamentID       *uuid.UUID             `json:"tournament_id,omitempty"`
	TeamID             *uuid.UUID             `json:"team_id,omitempty"`
	Amount             float64                `json:"amount"`
	PlanName           *string                `json:"plan_name,omitempty"`
	PaymentStatus      string                 `json:"payment_status"`
	PaymentMethod      *string                `json:"payment_method,omitempty"`
	TransactionID      *string                `json:"transaction_id,omitempty"`
	RawGatewayResponse map[string]interface{} `json:"raw_gateway_response"`
	PaidAt             *time.Time             `json:"paid_at,omitempty"`
	CreatedAt          time.Time              `json:"created_at"`
}

type MyRegistrationItem struct {
	ID                 uuid.UUID `json:"id"`
	TournamentID       uuid.UUID `json:"tournament_id"`
	TournamentName     string    `json:"tournament_name"`
	TournamentLogo     *string   `json:"tournament_logo,omitempty"`
	CategoryID         uuid.UUID `json:"category_id"`
	CategoryName       string    `json:"category_name,omitempty"`
	TeamID             uuid.UUID `json:"team_id"`
	TeamName           string    `json:"team_name"`
	TeamLogo           *string   `json:"team_logo,omitempty"`
	RegistrationStatus string    `json:"registration_status"`
	PaymentStatus      string    `json:"payment_status"`
	RosterStatus       string    `json:"roster_status"`
	IsRosterLocked     bool      `json:"is_roster_locked"`
	UnlockRequested    bool      `json:"unlock_requested"`
	CreatedAt          time.Time `json:"created_at"`
}

type IncomingTournamentActionItem struct {
	ID                 uuid.UUID `json:"id"`
	TournamentID       uuid.UUID `json:"tournament_id"`
	TournamentName     string    `json:"tournament_name"`
	TournamentLogo     *string   `json:"tournament_logo,omitempty"`
	CategoryID         uuid.UUID `json:"category_id"`
	CategoryName       *string   `json:"category_name,omitempty"`
	MaxTeams           *int      `json:"max_teams,omitempty"`
	ApprovedTeamsCount int       `json:"approved_teams_count"`
	MinPlayers         *int      `json:"min_players,omitempty"`
	MaxPlayers         *int      `json:"max_players,omitempty"`
	RegistrationFee    *float64  `json:"registration_fee,omitempty"`
	TeamID             *uuid.UUID `json:"team_id,omitempty"`
	TeamName           string    `json:"team_name"`
	TeamLogo           *string   `json:"team_logo,omitempty"`
	ContactName        *string   `json:"contact_name,omitempty"`
	ContactPhone       *string   `json:"contact_phone,omitempty"`
	SlipImg            *string   `json:"slip_img,omitempty"`
	ActionType         string    `json:"action_type"`
	Status             string    `json:"status"`
	PaymentStatus      *string   `json:"payment_status,omitempty"`
	RosterPlayerCount  int       `json:"roster_player_count"`
	CreatedAt          time.Time `json:"created_at"`
}

