-- Add team column to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS team TEXT;

-- Create index for team column
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team); 