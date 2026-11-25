# Mastery and Progress Calculations

> **Source:** [`computeProgressMetrics`](file:///m:/ai%20learning%20companion/packages/progress-engine/src/index.ts), [`DEFAULT_DOMAIN_PROGRESS_CONFIG`](file:///m:/ai%20learning%20companion/packages/progress-engine/src/index.ts)

## 1. Non-Negotiable Measurement Rules

1. **Study Time Does Not Buy Mastery:** `overallDemonstratedMasteryPercent` and domain mastery averages include **only** skills with `assessmentCount > 0`. Completing 100% of roadmap activities or logging 40+ hours with zero assessments yields `overallDemonstratedMasteryPercent = null` and `evidenceStatus = 'insufficient'`.
2. **Confidence Is Never Merged into Competence:** `confidenceGap = round(selfReportedConfidence - demonstratedCompetence)`. Overconfidence (`>= +20%` gap) is surfaced as an indicator without inflating competence.
3. **Time Accuracy:** On completed or partially completed non-break sessions, `studyTimeAccuracyPercent = round((actualMinutesTotal / plannedMinutesTotal) * 100)`.
4. **Consistency Score (14-Day Window):** `consistencyScorePercent = min(100, round((activeStudyDaysLast14 / 10) * 100))` across recorded sessions, assessments, quizzes, and `progressRecords`.
5. **Assessment Trend:** Splits chronologically sorted diagnostic & quiz scores into earlier vs. recent halves (`improving` if `delta >= +5`, `declining` if `delta <= -5`, `stable` otherwise, or `insufficient_data` when fewer than 2 attempts exist).

## 2. Configurable Domain Rules (`DomainProgressConfig`)

Callers can pass `domainConfigs[domainId]` overriding:
- `masteryThresholdPercent` (default `75`)
- `weakThresholdPercent` (default `45`)
- `retentionWindowDays` (default `14`)
- `minAssessmentsForEvidence` (default `1`)

## 3. Known Assumptions & Limitations

- Empty or malformed negative durations/scores are clamped cleanly to `0` (`safeNonNeg`) so metrics never emit `NaN`.
- Subjective/manual rubric responses marked `pending_review` require learner/rubric confirmation before contributing verified mastery increases.
