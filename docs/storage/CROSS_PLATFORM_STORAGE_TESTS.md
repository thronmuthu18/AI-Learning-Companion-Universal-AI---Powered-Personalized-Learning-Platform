# CROSS-PLATFORM STORAGE TESTS & VERIFICATION MATRIX

| Test Target | Execution Engine | Real vs Mocked | Verified Behaviors |
|---|---|---|---|
| Web `IndexedDBLearningRepository` (`tests/storage-architecture.test.ts`) | `idb` + `fake-indexeddb` | Real `idb` IndexedDB transactions & object stores in Node | Full CRUD (`save`/`delete`/`dismiss`), v2 indexes, `verifyIntegrity()`, `close()` + reopen restart persistence, atomic `importBackup()` |
| SQLite Schema & Migrations (`tests/storage-architecture.test.ts`) | `node:sqlite` (`DatabaseSync`) | Real SQLite engine running `SQLITE_MIGRATIONS` | `v1 -> v2` non-destructive upgrade preserving seeded v1 learner data, `PRAGMA foreign_keys = ON` orphan rejection, `ROLLBACK` recovery, `PRAGMA integrity_check` & `foreign_key_check` |
| Cross-Platform JSON Backup (`tests/storage-architecture.test.ts`, `tests/shared-foundation.test.ts`) | `@alc/storage` + `@alc/validation` | Real SHA-256 + Zod validation | Cross-platform round-trip, duplicate-ID idempotent upsert, tamper checksum mismatch rejection, prototype pollution rejection, oversized file rejection |
| Mobile `SQLiteLearningRepository` on Android/iOS devices | `expo-sqlite` | TypeScript verified (`tsc --noEmit`); device runtime **BLOCKED** | Blocked pending Android SDK/device (`BLK-03`) and macOS/Xcode (`BLK-01`) |
