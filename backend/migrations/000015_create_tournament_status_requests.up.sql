-- =========================================================================
-- Migration 000015: Create tournament_status_requests table
-- =========================================================================

CREATE TABLE IF NOT EXISTS tournament_status_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_status VARCHAR(50) NOT NULL,
    target_status VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
    reject_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_status_requests_tournament ON tournament_status_requests(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_status_requests_status ON tournament_status_requests(status);
CREATE INDEX IF NOT EXISTS idx_tournament_status_requests_requested_by ON tournament_status_requests(requested_by);
