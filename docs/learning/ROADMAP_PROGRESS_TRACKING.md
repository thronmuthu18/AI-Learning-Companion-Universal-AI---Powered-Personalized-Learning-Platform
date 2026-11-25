# ROADMAP PROGRESS TRACKING & EFFORT ANALYTICS

## Estimated vs. Actual Effort (`applyActivityStatusUpdate` & `computeRoadmapProgressStats`)
- Tracks per-activity `status`, `completedAt`, `estimatedMinutes`, and logged `actualMinutes` across both IndexedDB (Web) and SQLite (Android/iOS).
- Automatically updates parent `LearningMilestone` (`completed` / `in_progress` / `not_started` + `readinessState`) and `LearningStage` rollups whenever activities are toggled or completed.
- Summarizes `totalMilestones`, `completedMilestones`, `readyMilestones`, `blockedMilestones`, `completedActivities`, `estimatedMinutes`, `actualMinutes`, and overall `completionPercent`.
