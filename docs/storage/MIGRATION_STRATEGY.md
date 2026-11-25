# DATABASE MIGRATION STRATEGY — AI Learning Companion

## 1. Versioned SQLite Migrations (`@alc/storage`)
- `SQLITE_MIGRATIONS` maintains strictly sequential `version: 1..N` entries.
- `validateMigrationPlan()` verifies sequential versions, non-empty SQL statements, and mandatory `PRAGMA foreign_keys = ON;` in v1 before any migration runs.
- `getPendingMigrations(appliedVersions)` selects only unapplied versions recorded in `schema_migrations`.
- Every migration executes inside `db.withTransactionAsync(...)`; any SQL error rolls back the migration atomically without corrupting existing learner data.

## 2. Current Migration History
- **v1:** Creates all 15 relational tables with foreign keys (`ON DELETE CASCADE`) and base indexes (`idx_learner_skills_unique`, `idx_study_sessions_date`).
- **v2 (`CURRENT_SCHEMA_VERSION = 2`):** Non-destructively adds secondary query indexes (`idx_learning_goals_learner`, `idx_assessment_attempts_learner`, `idx_quiz_attempts_learner`, `idx_progress_records_date`, `idx_recommendations_learner`).

## 3. Web IndexedDB Upgrade Strategy
- `openDB(DB_NAME, CURRENT_SCHEMA_VERSION, { upgrade(db, _old, _new, tx) })` creates missing object stores and adds missing secondary indexes without clearing existing records.
