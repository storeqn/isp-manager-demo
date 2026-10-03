CREATE TABLE IF NOT EXISTS login_limits (
  key TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, bucket)
);
