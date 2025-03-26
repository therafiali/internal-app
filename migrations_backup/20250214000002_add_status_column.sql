-- Add status column to players table with default value
ALTER TABLE players ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Create index for status column
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status); 