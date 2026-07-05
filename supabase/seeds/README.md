# Seeds

Reference data (not schema). Run in the Supabase SQL editor as needed — these
are separate from the numbered `migrations/`, which own the schema.

## `historical_games.sql`

Loads every past-season game result (2022–2025) into `games` as non-aggregate
rows, so game-level pages (Rivals, Records) reflect the full history. Scores are
verified against the official season records sheet (run differentials match
exactly). Idempotent: it clears each season's non-aggregate rows and re-inserts,
touching only those seasons and never the aggregate season totals.

The live/current season is entered through the app, not seeded here.
