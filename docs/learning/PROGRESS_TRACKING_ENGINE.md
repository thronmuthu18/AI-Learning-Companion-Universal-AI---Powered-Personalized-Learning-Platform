# Universal Progress Tracking Engine

> **Implementation:** [`packages/progress-engine/src/index.ts`](file:///m:/ai%20learning%20companion/packages/progress-engine/src/index.ts)  
> **UI Surfaces:** [`ProgressDashboardScreen`](file:///m:/ai%20learning%20companion/apps/web/src/screens/AnalyticsAndSystemScreens.tsx), [`DashboardTab`](file:///m:/ai%20learning%20companion/apps/mobile/app/(tabs)/index.tsx)

## 1. Design Principles

`@alc/progress-engine` aggregates real, persisted learner records across **Web (IndexedDB)** and **Mobile (SQLite)** using identical deterministic formulas. It strictly separates:
- **Roadmap & Activity Progress** (`completedTopicsCount`, `inProgressActivitiesCount`, `pendingTopicsCount`, `skippedActivitiesCount`)
- **Logged Study Effort & Time Accuracy** (`totalStudyHours`, `plannedMinutesTotal`, `actualMinutesTotal`, `studyTimeAccuracyPercent`, `consistencyScorePercent`)
- **Demonstrated Skill Mastery** (`assessmentCount > 0`, `overallDemonstratedMasteryPercent`, `evidenceStatus`)
- **Self-Reported Confidence** (`averageSelfReportedConfidencePercent`, `confidenceGap`, `isOverconfident`)
- **Estimated Retention & Revision Signals** (`retentionIndicators`)
- **Historical Snapshots** (`historyTimeline`)

## 2. Multi-Level Aggregation

1. **Skill Level (`skillProgress`):** Activity completions, logged study minutes, confidence vs. verified competence, insufficient-evidence flags, and retention risk per skill.
2. **Topic Level (`topicProgress`):** Aggregates across `topicId` / `subjectId` across any domain (`Domain -> Category -> Subject -> Topic -> Subtopic -> Skill`).
3. **Domain Level (`domainProgress`):** Tracks goals, completion %, logged study hours, strong/weak/missing/unassessed skill counts, and domain-average verified mastery (`null` if no verified assessments exist).
4. **Goal Level (`goalProgress`):** Tracks milestone completion, logged vs. planned hours, assessed target skill counts, and deadline realism per concurrent active goal.
