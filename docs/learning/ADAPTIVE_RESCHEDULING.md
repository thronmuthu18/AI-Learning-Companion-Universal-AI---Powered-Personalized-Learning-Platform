# Adaptive Rescheduling & Schedule Preview

> **Implementation:** [`recalculateScheduleForMissedSessions`](file:///m:/ai%20learning%20companion/packages/study-planner/src/index.ts), [`previewScheduleRevision`](file:///m:/ai%20learning%20companion/packages/study-planner/src/index.ts)

## 1. Non-Destructive Revision Principles

- **Completed & Skipped Sessions Are Immutable:** Sessions with `status === 'completed'` or `status === 'skipped'` keep their exact `dateISO`, `actualMinutes`, `notes`, `difficultyRating`, and `completedAt` timestamps during any reschedule or routine change.
- **Targeted Relocation:** Only unfinished study sessions (`sessionType !== 'break'`) that are `postponed`, overdue (`dateISO < referenceDateISO`), or fall on newly marked `unavailableDatesISO` blackout dates are moved forward.
- **No Double Booking:** Occupied time windows `[startTimeHHMM, endTimeHHMM)` from preserved/future sessions remain reserved before relocated sessions are slotted cleanly from `referenceDateISO` onward.

## 2. Preview-Before-Commit Flow

Both Web (`DailyPlannerScreen`) and Mobile (`PlannerTab`) invoke `previewScheduleRevision` before mutating persisted schedules:

1. Computes `preview: ScheduleRevisionPreview` (`preservedCompletedCount`, `movedMissedOrPostponedCount`, `previousEndDateISO`, `newEndDateISO`, `dailyBudgetMinutes`, `conflicts`, `summary`) + candidate `revisedSchedule` without writing to storage.
2. Presents the summary banner to the learner (`Confirm Revision` / `Cancel`).
3. Only after confirmation saves `revisedSchedule` via `saveStudySchedule(...)` cleanly into IndexedDB (Web) or SQLite (Android/iOS).
