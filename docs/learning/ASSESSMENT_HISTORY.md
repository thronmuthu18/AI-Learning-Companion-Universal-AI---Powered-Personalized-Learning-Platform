# ASSESSMENT HISTORY & PROGRESS COMPARISONS (Phase 10)

## Offline Persistence & History Comparison (`buildAttemptComparisonHistory`)
All assessment attempts, individual question answers, evaluation methods, per-question timing, confidence ratings, misconception flags, and completion status persist offline via IndexedDB (`Web`) and SQLite (`Android`/`iOS`), and export cleanly inside SHA-256 verified `BackupEnvelope` snapshots.

`buildAttemptComparisonHistory` computes:
- `totalAttempts`, `latestScorePercent`, `bestScorePercent`, `averageScorePercent`
- `scoreTrendDelta` (first-to-latest progression) and per-attempt `scoreDeltaFromPrevious`
- `repeatedWeakSkills` across chronological attempts
