# PROGRESS TRACKING ENGINE (`@alc/progress-engine`)

## Responsibilities
- Computes strictly database-backed progress metrics (`computeProgressMetrics`) from `LearningPath`, `StudySession`, `AssessmentAttempt`, `QuizAttempt`, `LearnerSkill`, and `ProgressRecord`.
- Calculates `currentStreakDays` and `longestStreakDays` from actual active calendar dates (`computeStreaksFromDates`).
- Builds rolling 7-day activity summaries (`weeklyActivity`) and sorted `weakAreas` (`demonstratedCompetence < 75`).
- Zero fabricated study hours, streaks, or scores.
