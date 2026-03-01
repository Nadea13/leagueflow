-- Update the matches_stage_check constraint to include all possible stages
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_stage_check;
ALTER TABLE matches ADD CONSTRAINT matches_stage_check CHECK (
    stage IN (
        'league', 
        'group', 
        'round_of_64', 
        'round_of_32', 
        'round_of_16', 
        'quarter_final', 
        'semi_final', 
        'final'
    )
);
