# ROADMAP SCHEDULING & MULTI-GOAL WORKLOAD (`@alc/learning-engine` + `@alc/study-planner`)

## Daily, Weekly, and Multi-Goal Budgets
- Coordinates multiple concurrent goals through `generateMultiGoalRoadmapBundle` (`@alc/learning-engine`), capping combined weekly hours cleanly within the learner's real `availableHoursPerDay * studyDaysPerWeek` capacity.
- Converts unfinished roadmap milestones and activities into concrete `StudySchedule` / `StudySession` entries (`generateStudySchedule`, `getDailySessions`, `getWeeklyBuckets`), automatically placing `assessment` checkpoints and spaced `revision` sessions without overwriting daily budgets.
- Flags past or mathematically infeasible target dates via `LearningPath.deadlineStatus` and `StudySchedule.feasibilityWarning`.
- Reschedules missed/overdue uncompleted sessions via `recalculateScheduleForMissedSessions`.
