# Study Scheduling Rules & Conflict Detection

> **Implementation:** [`generateStudySchedule`](file:///m:/ai%20learning%20companion/packages/study-planner/src/index.ts), [`generateMultiGoalStudySchedule`](file:///m:/ai%20learning%20companion/packages/study-planner/src/index.ts), [`detectOverlappingSessions`](file:///m:/ai%20learning%20companion/packages/study-planner/src/index.ts)

## 1. Hard Scheduling Guarantees

- **Zero Time-Slot Overlaps:** Every scheduled session assigns concrete `[startTimeHHMM, endTimeHHMM]` intervals checked against `occupiedSlotsByDate`. `detectOverlappingSessions(sessions)` validates every same-date session pair cleanly.
- **Daily & Weekly Capacity Enforcement:** Study sessions (`sessionType !== 'break'`) never exceed `dailyAvailableMinutes` (`availableHoursPerDay * 60`) or `weeklyBudgetMinutes` (`dailyMinutesBudget * studyDaysPerWeek`).
- **Preferred Study Days & Blackout Dates:** Dates matching `unavailableDatesISO` are skipped completely; weekday selection prioritizes `preferredStudyDays` (`0..6`) or deterministically spaces `studyDaysPerWeek` days across each 7-day cycle.
- **Prerequisite Order Preservation:** Queue items strictly inherit stage → milestone → activity order from `@alc/learning-engine`, ensuring weak/missing prerequisite concepts are always scheduled before advanced milestones and assessments.
- **Preserved Completed Work:** Passing `existingSessionsToPreserve` seeds daily/weekly used budgets and occupied time windows so previously completed or partially completed sessions stay anchored in history.

## 2. Feasibility & Conflict Warnings (`ScheduleConflict`)

Whenever constraints conflict with the learner's goal deadline or preferences, `@alc/study-planner` avoids silent failure or crash and emits typed `ScheduleConflict` records (`{ dateISO, reason, severity: 'warning' | 'overload' }`):

| Condition | Result |
|---|---|
| `availableHoursPerDay <= 0` or invalid | Safely clamps to `0.5h/day` and emits a `'warning'` conflict entry. |
| `targetEndDateISO < startDateISO` | Marks `isRealistic = false`, sets `feasibilityWarning`, emits `'overload'` conflict. |
| Required hours exceed capacity before deadline | Marks `isRealistic = false`, calculates required daily study hours in `feasibilityWarning`, emits `'overload'` conflict. |
| Multi-goal combined hours exceed capacity | Reports per-goal overload warnings in `MultiGoalScheduleReport.overloadWarnings`. |
