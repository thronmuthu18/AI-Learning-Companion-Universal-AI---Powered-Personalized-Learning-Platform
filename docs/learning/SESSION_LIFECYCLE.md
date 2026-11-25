# Study Session Lifecycle & State Machine

> **Implementation:** [`canTransitionSessionStatus`](file:///m:/ai%20learning%20companion/packages/study-planner/src/index.ts), [`transitionStudySession`](file:///m:/ai%20learning%20companion/packages/study-planner/src/index.ts)  
> **Schema:** [`CompletionStatusSchema`](file:///m:/ai%20learning%20companion/packages/validation/src/index.ts), [`StudySessionSchema`](file:///m:/ai%20learning%20companion/packages/validation/src/index.ts)

## 1. Supported Session States (`CompletionStatus`)

| State | UI Label | Meaning |
|---|---|---|
| `not_started` | Planned | Scheduled future/today study session awaiting start. |
| `in_progress` | In Progress | Actively started session (`startedAt` recorded). |
| `completed` | Completed | Finished (`completedAt` & `actualMinutes` logged; updates roadmap milestone progress). |
| `partially_completed` | Partial | Learner logged part of the block; creates a carry-over continuation session when remainder ≥ 15 min. |
| `skipped` | Skipped | Deliberately omitted without rescheduling. |
| `postponed` | Postponed | Deferred cleanly for relocation by Adaptive Rescheduling. |

## 2. Allowed State Transitions

- **`not_started` →** `not_started`, `in_progress`, `completed`, `partially_completed`, `skipped`, `postponed`
- **`in_progress` →** `in_progress`, `completed`, `partially_completed`, `skipped`, `postponed`, `not_started`
- **`partially_completed` →** `partially_completed`, `completed`, `postponed`, `skipped`, `not_started`
- **`postponed` →** `postponed`, `not_started`, `in_progress`, `completed`, `skipped`
- **`skipped` →** `skipped`, `not_started`
- **`completed` →** `completed`, `not_started` *(reopen only; direct `completed -> skipped` throws explicitly)*

## 3. Partial Completion Split

When transitioning a session with remaining time `plannedMinutes - actualMinutes >= 15` to `partially_completed`, `transitionStudySession` returns both `updatedSession` and a non-null `continuationSession` queued for the next study day so no learning material gets dropped.
