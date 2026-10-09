-- Clean match_status enum to have only 4 statuses: scheduled, live, finished, cancelled
ALTER TABLE matches ALTER COLUMN status TYPE varchar USING status::varchar;

UPDATE matches
SET status = CASE
    WHEN status IN ('warmup', 'first_half', 'half_time', 'second_half', 'extra_time', 'penalties', 'live') THEN 'live'
    WHEN status IN ('completed', 'finished') THEN 'finished'
    WHEN status IN ('cancelled', 'canceled', 'postponed') THEN 'cancelled'
    ELSE 'scheduled'
END;

DROP TYPE IF EXISTS match_status CASCADE;
DROP TYPE IF EXISTS match_status_enum CASCADE;
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'finished', 'cancelled');

ALTER TABLE matches ALTER COLUMN status TYPE match_status USING status::match_status;
ALTER TABLE matches ALTER COLUMN status SET DEFAULT 'scheduled'::match_status;
