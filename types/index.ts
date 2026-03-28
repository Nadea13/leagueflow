export type TournamentStatus = 'draft' | 'active' | 'completed';
export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface Tournament {
    id: string;
    user_id: string;
    name: string;
    format: string;
    status: TournamentStatus;
    description?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    number_of_pitches?: number | null;
    max_teams?: number | null;
    advancing_teams?: number | null;
    is_registration_open: boolean;
    registration_fee?: number | null;
    bank_name?: string | null;
    bank_account_name?: string | null;
    bank_account_number?: string | null;
    plan?: 'free' | 'tournament' | 'monthly' | 'yearly';
    payment_status?: string | null;
    payment_id?: string | null;
    payment_method?: string | null;
    created_at: string;
    updated_at?: string;
}

export interface Match {
    id: string;
    tournament_id: string;
    home_team_id: string | null;
    away_team_id: string | null;
    home_score: number | null;
    away_score: number | null;
    round: number;
    stage: 'league' | 'group' | 'round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final';
    winner_id?: string | null;
    is_manual: boolean;
    status: MatchStatus;
    match_date?: string | null;
    match_time?: string | null;
    venue?: string | null;
    venue_id?: string | null;
    pitch_number?: number | null;
    match_index?: number | null;
    created_at: string;
    // Timer Fields
    timer_status?: 'playing' | 'paused' | 'stopped';
    elapsed_before_pause?: number; // Seconds calculated before pause
    current_minute?: number | string | null;
    home_team?: { id: string; name: string; logo_url?: string | null };
    away_team?: { id: string; name: string; logo_url?: string | null };
    // Penalty Shootout (joined)
    penalty_home_score?: number | null;
    penalty_away_score?: number | null;
}

export interface Team {
    id: string;
    user_id: string | null;
    name: string;
    description?: string | null;
    logo_url?: string | null;
    tournament_id?: string | null;
    group_name?: string | null;
    created_at: string;
}

export interface TournamentTeam {
    id: string;
    tournament_id: string | null;
    team_id: string | null; // Link to Global Team
    user_id: string | null;
    name: string;
    description?: string | null;
    group_name?: string | null;
    logo_url?: string | null;
    is_roster_locked: boolean;
    created_at: string;
}

export interface Player {
    id: string;
    team_id?: string | null;
    global_team_id?: string | null;
    name: string;
    number?: number | null;
    position?: string | null;
    birth_date?: string | null;
    photo_url?: string | null;
    global_player_id?: string | null;
    created_at: string;
    // Join
    global_player?: GlobalPlayer | null;
}

export interface GlobalPlayer {
    id: string;
    name: string;
    photo_url?: string | null;
    id_card_url?: string | null;
    date_of_birth?: string | null;
    created_by?: string | null;
    created_at: string;
}

export type EventType = 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'foul' | 'penalty' | 'substitution' | 'var' | 'add_time' | 'kick_off' | 'half_time' | 'full_time' | 'match_paused' | 'match_resumed' | 'penalty_shot' | 'save' | 'corner' | 'injury';

export interface MatchEvent {
    id: string;
    match_id: string;
    team_id: string;
    player_id?: string | null;
    event_type: EventType;
    minute: number;
    extra_info?: any; // JSONB
    created_at: string;
    // Join
    player_name?: string; // For display convenience if joined
}

export interface Goal {
    id: string;
    match_id: string;
    team_id: string;
    player_name: string;
    goal_time?: string;
    created_at: string;
}

export interface Standing {
    tournament_id: string;
    team_id: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    gd: number;
    pts: number;
    // Join
    team?: { name: string; logo_url?: string | null };
}

export interface TournamentMember {
    id: string;
    tournament_id: string;
    user_id: string | null;
    email: string | null;
    role: 'admin' | 'editor' | 'viewer';
    status: 'pending' | 'accepted';
    created_at: string;
}

export type ActionResponse<T = any> = {
    success: boolean;
    message?: string;
    error?: string;
    data?: T;
};

export interface AuditLog {
    id: string;
    user_id: string | null;
    action: string;
    target_type: string;
    target_id: string;
    details: any;
    ip_address?: string | null;
    created_at: string;
    // Join
    user?: { email: string };
}

export interface Notification {
    id: string;
    user_id: string;
    type: 'invite' | 'payment' | 'system';
    title: string;
    message: string;
    link?: string | null;
    is_read: boolean;
    created_at: string;
}

export interface Payment {
    id: string;
    amount: number;
    status: string;
    payment_method: string;
    plan: string | null;
    created_at: string;
    tournament_id: string | null;
    provider_id: string | null; // PG Transaction ID
    subscription_expires_at: string | null;
    // Join
    user?: { email: string; full_name?: string };
}

export interface ManagerPlan {
    id: string;
    name: string;
    description?: string[] | null;
    price: number;
    discounted_price?: number | null;
    duration?: string | null;
    max_teams: number; // 0 = infinity
    max_players_per_team: number; // 0 = infinity
    support_level: string;
    recommended: boolean;
    created_at: string;
    updated_at: string;
}

export interface OrganizerPlan {
    id: string;
    name: string;
    description?: string[] | null;
    price: number;
    discounted_price?: number | null;
    duration?: string | null;
    max_tournaments: number; // 0 = infinity
    max_teams_per_tournament: number; // 0 = infinity
    format_support: string;
    invite_enabled: boolean;
    register_enabled: boolean;
    stats_support: string;
    support_level: string;
    recommended: boolean;
    created_at: string;
    updated_at: string;
}

export type Plan = ManagerPlan | OrganizerPlan;

export interface Product {
    id: string;
    name: string;
    description: string[];
    price: number;
    discounted_price: number | null;
    duration: string | null;
    user_limit?: number | null;
    teams_limit: number;
    format_support?: string;
    invite_enabled: boolean;
    register_enabled: boolean;
    stats_support?: string;
    support_level?: string;
    recommended: boolean;
    target_role: 'manager' | 'organizer' | 'admin';
    created_at: string;
    updated_at: string;
}

// ========== New Types for Feature Improvements ==========

export interface Venue {
    id: string;
    tournament_id: string;
    name: string;
    address?: string | null;
    google_maps_url?: string | null;
    capacity?: number | null;
    notes?: string | null;
    created_at: string;
}

export interface TournamentRules {
    tournament_id: string;
    half_duration: number;
    extra_time_duration: number;
    max_squad_size?: number | null;
    min_squad_size?: number | null;
    max_substitutions: number;
    yellow_card_ban_threshold: number;
    red_card_ban_matches: number;
    points_for_win: number;
    points_for_draw: number;
    points_for_loss: number;
    created_at?: string;
    updated_at?: string;
}

export interface PenaltyShot {
    id: string;
    match_id: string;
    team_id: string;
    player_id?: string | null;
    round: number;
    scored: boolean;
    created_at: string;
    // Join
    player?: { name: string } | null;
}

export interface Announcement {
    id: string;
    tournament_id: string;
    title: string;
    content?: string | null;
    is_pinned: boolean;
    created_at: string;
}

export interface TeamPayment {
    id: string;
    tournament_id: string;
    team_id: string;
    amount: number;
    status: 'pending' | 'paid' | 'waived';
    paid_at?: string | null;
    notes?: string | null;
    created_at: string;
    team?: { name: string; logo_url?: string | null };
}

export interface Registration {
    id: string;
    tournament_id: string;
    team_name: string;
    contact_name: string;
    contact_phone: string;
    logo_url?: string | null;
    existing_team_id?: string | null;
    slip_url?: string | null;
    payment_status: 'PENDING' | 'PAID' | 'REJECTED';
    trans_ref?: string | null;
    description?: string | null;
    created_at: string;
}
