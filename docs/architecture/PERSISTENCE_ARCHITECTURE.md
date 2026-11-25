# PERSISTENCE ARCHITECTURE — AI Learning Companion

## 1. Platform Storage Matrix
- **Web (`apps/web/src/storage/indexeddb-repository.ts`):** `IndexedDBLearningRepository` backed by browser IndexedDB (`ai_learning_companion_db`, v1) with 15 object stores and transactional writes via `idb`.
- **Android & iOS (`apps/mobile/src/storage/sqlite-repository.ts`):** `SQLiteLearningRepository` backed by local SQLite (`ai_learning_companion.db`) via `expo-sqlite` with `PRAGMA foreign_keys = ON;` and transactional migrations. *(Note: On Android, Expo's `expo-sqlite` provides direct native SQLite storage with shared TypeScript migrations across both Android & iOS without duplicating a separate Kotlin Room database).*

## 2. Migration Strategy & Safety (`@alc/storage`)
- `SQLITE_MIGRATIONS` defines versioned DDL statements (`version: 1`).
- `validateMigrationPlan()` verifies strictly sequential versions (`1..N`), non-empty SQL statements, and mandatory `PRAGMA foreign_keys = ON;`.
- `getPendingMigrations(appliedVersions)` filters `schema_migrations` so each version runs inside `db.withTransactionAsync(...)` exactly once.

## 3. Cross-Platform Backup, Export/Import & Security
- `exportSnapshotToBackup()` builds a `BackupEnvelope` (`schemaVersion: 1`) and stamps `metadata.checksumSha256` using WebCrypto (`crypto.subtle`) or deterministic pure-TS SHA-256 (`pureSha256Hex`).
- `validateAndParseImportBackup()` enforces:
  1. Payload byte size `0 < bytes <= 25 MB`
  2. Prototype-pollution guard (`hasUnsafePrototypeKeys`)
  3. Strict Zod `BackupEnvelopeSchema` entity validation
  4. Exact SHA-256 checksum match before writing to IndexedDB or SQLite.
