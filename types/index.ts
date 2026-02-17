export type TournamentStatus = 'draft' | 'active' | 'completed';
export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface Tournament {
    id: string;
    name: string;
    format: string;
    status: TournamentStatus;
    start_date?: string | null;
    end_date?: string | null;
    number_of_pitches?: number | null;
    plan?: 'free' | 'tournament' | 'monthly' | 'yearly';
    payment_status?: string | null;
    payment_id?: string | null;
    payment_method?: string | null;
    created_at: string;
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
    match_index?: number | null;
    created_at: string;
    // Timer Fields
    timer_status?: 'playing' | 'paused' | 'stopped';
    elapsed_before_pause?: number; // Seconds calculated before pause
    current_minute?: number | string | null;
    home_team?: { name: string; logo_url?: string | null };
    away_team?: { name: string; logo_url?: string | null };
}

export interface Team {
    id: string;
    tournament_id: string | null;
    name: string;
    group_name?: string | null;
    logo_url?: string | null;
    created_at: string;
}

export interface Player {
    id: string;
    team_id: string;
    name: string;
    number?: number | null;
    position?: string | null;
    created_at: string;
}

export type EventType = 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'foul' | 'penalty' | 'substitution' | 'var' | 'add_time' | 'kick_off' | 'half_time' | 'full_time';

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

export interface Product {
    id: string;
    name: string;
    description?: string[] | null;
    price: number;
    discounted_price?: number | null;
    duration?: string | null;
    user_limit?: number | null;
    teams_limit: number; // 0 = infinity
    format_support: string;
    invite_enabled: boolean;
    register_enabled: boolean;
    stats_support: string;
    support_level: string;
    recommended: boolean;
    created_at: string;
    updated_at: string;
}
