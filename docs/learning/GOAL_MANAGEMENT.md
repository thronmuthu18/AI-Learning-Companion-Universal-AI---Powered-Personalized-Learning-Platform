# MULTI-GOAL MANAGEMENT & PRIORITISATION (Phase 09)

## Goal Lifecycle (`@alc/learning-engine` + `@alc/storage`)
All goal states persist in IndexedDB (Web) and SQLite (Android/iOS) through `LearningRepository.saveGoal` and `deleteGoal`:
- `createLearningGoal`: Initializes `status: 'active'`, priority, horizon, goal kind, scope hours, and creation history entry.
- `updateLearningGoal`: Edits titles, descriptions, targets, target dates, or priority while appending field-level `GoalHistoryEntry` records.
- `transitionGoalStatus`: Supports `'active' | 'paused' | 'completed' | 'archived'`.
- `setGoalPriority`: Updates `'high' | 'medium' | 'low'` priority cleanly.
- Safe deletion via `deleteGoalSafely(goalId)`.

## Available-Hours Workload Prioritisation (`prioritizeAndAllocateGoals`)
Supports multiple simultaneous active goals while guaranteeing allocated weekly study hours never exceed `availableHoursPerDay * studyDaysPerWeek`:
- Scores active goals using importance weight (`high = 3`, `medium = 2`, `low = 1`), target-date urgency, and prerequisite readiness (`SkillGraph`).
- Caps total `allocatedWeeklyHours` to the learner's real `weeklyCapacityHours`.
- Surfaces transparent `overloadWarning` and deadline trimming notices when concurrent goals exceed weekly study capacity.
