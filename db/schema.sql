CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_key TEXT NOT NULL UNIQUE,
  player_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  elapsed INTEGER NOT NULL DEFAULT 0,
  bosses INTEGER NOT NULL DEFAULT 0,
  perfect_dash INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  runs INTEGER NOT NULL DEFAULT 0,
  total_bosses INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS leaderboard_rank_idx
ON leaderboard(score DESC, elapsed DESC, bosses DESC, updated_at ASC);

CREATE TABLE IF NOT EXISTS duo_leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_key TEXT NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  player_a TEXT NOT NULL,
  player_b TEXT NOT NULL,
  room TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  elapsed INTEGER NOT NULL DEFAULT 0,
  bosses INTEGER NOT NULL DEFAULT 0,
  runs INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS duo_leaderboard_rank_idx
ON duo_leaderboard(score DESC, elapsed DESC, bosses DESC, updated_at ASC);
