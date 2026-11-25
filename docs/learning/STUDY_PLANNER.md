# STUDY PLANNER ENGINE (`@alc/study-planner`)

## Responsibilities
- Allocates roadmap lessons, exercises, projects, milestone assessments, and spaced-repetition revision sessions (`generateStudySchedule`).
- Strictly respects `availableHoursPerDay` (`dailyAvailableMinutes`) and `studyDaysPerWeek`.
- Detects unrealistic deadlines (including inverted dates or workloads exceeding capacity) via `isRealistic` and `feasibilityWarning`.
- Reschedules overdue sessions forward (`recalculateScheduleForMissedSessions`) and derives daily, weekly (`getWeeklyBuckets`), and monthly (`getMonthlyTargets`) views.
