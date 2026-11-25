# Intelligent Study Planner (Module G) — Architecture & Universal Design

> **Package:** [`packages/study-planner/src/index.ts`](file:///m:/ai%20learning%20companion/packages/study-planner/src/index.ts)  
> **Web Screens & State:** [`DailyPlannerScreen`](file:///m:/ai%20learning%20companion/apps/web/src/screens/PlannerAndLearningScreens.tsx), [`AppContext.tsx`](file:///m:/ai%20learning%20companion/apps/web/src/state/AppContext.tsx)  
> **Mobile Screens & State:** [`planner.tsx`](file:///m:/ai%20learning%20companion/apps/mobile/app/(tabs)/planner.tsx), [`MobileContext.tsx`](file:///m:/ai%20learning%20companion/apps/mobile/src/state/MobileContext.tsx)

## 1. Purpose

Module G transforms a learner's prerequisite-ordered `LearningPath` (produced by Module F in `@alc/learning-engine`) into a realistic, non-overlapping daily, weekly, and monthly timetable tailored to the learner's real schedule constraints across **all knowledge domains** (Engineering, Science, Accounting, Competitive Exams, Programming, Design, Medical, Humanities, and custom goals).

## 2. Core Pipeline

1. **Roadmap Activity Ingestion (`queue`):** Iterates `LearningPath.stages` → `milestones` → `activities` sequentially, preserving foundation-first prerequisite order and carrying each item's `activityType`, `estimatedMinutes`, `skillId`, and `reason`.
2. **Constraint Normalization & Safety Clamping:**
   - Clamps empty/invalid `availableHoursPerDay` (`<= 0` or non-finite) safely to `0.5h/day` (`30 min`) and `studyDaysPerWeek` to `1..7`, recording transparent warning items in `StudySchedule.conflicts`.
3. **Time-Window & Blackout Placement (`reserveSlotAndPush`):**
   - Honors `preferredStudyDays` (`0=Sun..6=Sat`), skips `unavailableDatesISO` blackout dates, respects `weeklyBudgetMinutes` & `dailyAvailableMinutes`, and uses `findNextFreeSlot` (`preferredStartTimeHHMM` onwards) with zero `[startTimeHHMM, endTimeHHMM)` time collisions (`detectOverlappingSessions`).
4. **Configurable Study Techniques & Breaks (`StudyTechnique`, `StudyBreakConfig`):**
   - `pomodoro` (`25m` focus chunks; `5m` short / `15m` long break every 3 blocks when `includeBreaks = true`)
   - `deep_focus` (`75m` deep work chunks; `10m` short / `25m` long break every 2 blocks)
   - `spaced_blocks` (`45m` balanced blocks; `10m` short / `20m` long break every 3 blocks)
5. **Spaced Revision Insertion:** Automatically interleaves spaced-revision blocks every `revisionFrequencyDays` study days within remaining daily capacity.
6. **Multi-Goal Priority Coordination (`generateMultiGoalStudySchedule`):** Ranks active goals (`high > medium > low`) and threads `sharedUsedMinutes` + `sharedOccupiedSlots` across all goal schedules so combined sessions across goals never double-book a time window or exceed daily/weekly learner capacity.
