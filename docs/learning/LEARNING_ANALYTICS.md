# Learning Analytics — Cross-Platform Parity & Privacy

> **Web Screen:** [`AnalyticsAndSystemScreens.tsx`](file:///m:/ai%20learning%20companion/apps/web/src/screens/AnalyticsAndSystemScreens.tsx)  
> **Mobile Tabs:** [`apps/mobile/app/(tabs)/index.tsx`](file:///m:/ai%20learning%20companion/apps/mobile/app/(tabs)/index.tsx), [`apps/mobile/app/(tabs)/planner.tsx`](file:///m:/ai%20learning%20companion/apps/mobile/app/(tabs)/planner.tsx)

## 1. Parity Across Web & Mobile

Both Web (`AppContext`) and Mobile (`MobileContext`) invoke the exact same shared pure TypeScript functions (`computeProgressMetrics`, `evaluateAdaptiveRules`, `previewAdaptivePlanAdjustments`) from `@alc/progress-engine` and `@alc/adaptive-engine`, passing persisted IndexedDB (Web) or SQLite (Android/iOS) snapshots.

## 2. Honest Empty States & Zero Fabricated Metrics

- When zero assessments exist, dashboards display `"Insufficient Evidence"` banners rather than synthetic sample percentages or fake streaks.
- All progress charts (`weeklyActivity`, `domainProgress`, `goalProgress`, `historyTimeline`) render solely from recorded `StudySession`, `ProgressRecord`, `AssessmentAttempt`, and `QuizAttempt` records.

## 3. Local-Only Privacy & Backup Compatibility

- Zero telemetry, analytics beacons, or personal learning metrics ever leave the device.
- Extended fields on `Recommendation` (`recommendationType`, `targetDomainId`, `supportingEvidence`, `requiresConfirmation`, `status`) and `ProgressRecord` (`averageMasteryPercent`, `completedMilestonesCount`) are declared in Zod (`RecommendationSchema`, `ProgressRecordSchema`) so SHA-256 checksum verification succeeds across Web <-> Android <-> iOS backups.
