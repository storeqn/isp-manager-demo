-- Shared snapshot storage for the demo; no automatic seeding or data import.
-- Access must be provided through an authenticated backend, never directly.
CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL CHECK (json_valid(data)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
