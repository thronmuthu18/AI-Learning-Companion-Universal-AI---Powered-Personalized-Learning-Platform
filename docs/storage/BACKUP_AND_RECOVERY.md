# BACKUP, EXPORT & RECOVERY — AI Learning Companion

## 1. Export Pipeline (`exportSnapshotToBackup`)
- Captures all learner records (`learner`, `profile`, `goals`, `learnerSkills`, `assessmentAttempts`, `assessmentAnswers`, `learningPaths`, `studySchedules`, `studySessions`, `progressRecords`, `recommendations`, `quizAttempts`, `userResources`, `settings`).
- Stamps `metadata`: `schemaVersion`, `appVersion`, `exportedAt`, `sourcePlatform`, `recordCounts`, and `checksumSha256` (computed via WebCrypto `crypto.subtle` or pure-TS `pureSha256Hex`).

## 2. Import Validation & Recovery (`validateAndParseImportBackup` + `importBackup`)
1. **Size Guard:** Rejects empty or `> 25 MB` files (`validateBackupSize`).
2. **Prototype Pollution Guard:** Rejects payloads containing `"__proto__"`, `"constructor"`, or `"prototype"` keys (`hasUnsafePrototypeKeys`).
3. **Strict Schema Validation:** Validates every entity array/object against `BackupEnvelopeSchema` (`@alc/validation`).
4. **Cryptographic Integrity:** Recomputes SHA-256 over canonical `data` JSON and rejects any mismatch.
5. **Version Guard:** Accepts `1 <= schemaVersion <= CURRENT_SCHEMA_VERSION`; rejects incompatible future versions.
6. **Atomic Restore:**
   - **Web (`IndexedDBLearningRepository`):** Executes clear + puts inside one multi-store `readwrite` transaction with `tx.abort()` on error.
   - **Mobile (`SQLiteLearningRepository`):** Executes `DELETE` + `INSERT OR REPLACE` inside one `db.withTransactionAsync(...)` block so interrupted or failing imports automatically roll back without losing existing data.
