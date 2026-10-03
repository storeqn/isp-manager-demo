# D1 migrations

Apply `0001_app_state.sql` then `0002_login_limits.sql` in the Console for
`isp-manager-db`. Bind the database to Pages Functions as `DB`.

The first table stores a single, revisioned version 1 demo snapshot. The second
stores bounded login rate-limit buckets. Neither migration imports or deletes
subscriber data. Both are safe to execute again.

Pages Functions validates snapshots server-side, authenticates requests with a
signed HttpOnly session cookie, and rejects stale writes atomically. Setup and
limitations are documented in the root README. No router credentials or
production network connections are included.
