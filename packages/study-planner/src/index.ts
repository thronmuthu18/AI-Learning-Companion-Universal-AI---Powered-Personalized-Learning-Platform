import type {
  CompletionStatus,
  LearningGoal,
  LearningPath,
  ScheduleConflict,
  SessionType,
  StudyBreakConfig,
  StudySchedule,
  StudyScheduleMode,
  StudySession,
  StudyTechnique,
} from '@alc/shared-types';

export interface OccupiedSlot {
  startHHMM: string;
  endHHMM: string;
}

export interface GenerateScheduleParams {
  scheduleId: string;
  learnerId: string;
  goalId?: string;
  path: LearningPath;
  startDateISO: string;
  targetEndDateISO: string | null;
  availableHoursPerDay: number;
  studyDaysPerWeek: number;
  sessionLengthMinutes?: number;
  revisionFrequencyDays?: number;
  preferredStudyDays?: number[]; // 0=Sun..6=Sat
  preferredStartTimeHHMM?: string | null;
  unavailableDatesISO?: string[];
  weeklyBudgetMinutes?: number;
  occupiedSlotsByDate?: Record<string, OccupiedSlot[]>;
  usedMinutesByDate?: Record<string, number>;
  scheduleMode?: StudyScheduleMode;
  studyTechnique?: StudyTechnique;
  includeBreaks?: boolean;
  breakConfig?: Partial<StudyBreakConfig>;
  existingSessionsToPreserve?: StudySession[];
}

export interface WeeklyPlanBucket {
  weekStartISO: string;
  weekEndISO: string;
  totalMinutes: number;
  completedMinutes: number;
  sessions: StudySession[];
}

export interface MonthlyTargetSummary {
  monthKey: string; // YYYY-MM
  totalPlannedHours: number;
  completedHours: number;
  sessionsCount: number;
  completedCount: number;
  focusSkills: string[];
}

export interface ScheduleRevisionPreview {
  preservedCompletedCount: number;
  movedMissedOrPostponedCount: number;
  previousEndDateISO: string;
  newEndDateISO: string;
  dailyBudgetMinutes: number;
  conflicts: ScheduleConflict[];
  summary: string;
}

export interface MultiGoalScheduleReport {
  combinedDailyBudgetMinutes: number;
  combinedWeeklyCapacityMinutes: number;
  isRealistic: boolean;
  overloadWarnings: string[];
  schedules: StudySchedule[];
  allSessions: StudySession[];
}

const DEFAULT_BREAK_CONFIG: Record<StudyTechnique, StudyBreakConfig> = {
  pomodoro: { shortBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 3 },
  deep_focus: { shortBreakMinutes: 10, longBreakMinutes: 25, sessionsBeforeLongBreak: 2 },
  spaced_blocks: { shortBreakMinutes: 10, longBreakMinutes: 20, sessionsBeforeLongBreak: 3 },
  custom: { shortBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 3 },
};

const TECHNIQUE_DEFAULT_CHUNK: Record<StudyTechnique, number> = {
  pomodoro: 25,
  deep_focus: 75,
  spaced_blocks: 45,
  custom: 45,
};

function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function diffDaysISO(startISO: string, endISO: string): number {
  const a = Date.parse(`${startISO}T00:00:00Z`);
  const b = Date.parse(`${endISO}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

function toMinutesOfDay(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return 18 * 60;
  const h = Math.max(0, Math.min(23, Number(match[1])));
  const m = Math.max(0, Math.min(59, Number(match[2])));
  return h * 60 + m;
}

function fromMinutesOfDay(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getMondayWeekKey(dateISO: string): string {
  const dt = new Date(`${dateISO}T00:00:00Z`);
  const day = dt.getUTCDay();
  const diffToMon = (day + 6) % 7;
  return addDaysISO(dateISO, -diffToMon);
}

function isAllowedStudyDate(
  dateISO: string,
  startDateISO: string,
  studyDaysPerWeek: number,
  preferredStudyDays: number[] | undefined,
  unavailableSet: Set<string>,
): boolean {
  if (unavailableSet.has(dateISO)) return false;
  if (preferredStudyDays && preferredStudyDays.length > 0) {
    const weekday = new Date(`${dateISO}T00:00:00Z`).getUTCDay();
    return preferredStudyDays.includes(weekday);
  }
  const dayOffset = diffDaysISO(startDateISO, dateISO);
  return (dayOffset % 7) < Math.max(1, Math.min(7, studyDaysPerWeek));
}

function findNextFreeSlot(
  preferredStartMin: number,
  durationMinutes: number,
  occupied: OccupiedSlot[],
): { startMin: number; endMin: number } | null {
  const sorted = occupied
    .map((s) => ({ start: toMinutesOfDay(s.startHHMM), end: toMinutesOfDay(s.endHHMM) }))
    .sort((a, b) => a.start - b.start);

  let cursor = preferredStartMin;
  for (const block of sorted) {
    if (cursor + durationMinutes <= block.start) {
      break;
    }
    if (cursor < block.end) {
      cursor = block.end;
    }
  }
  if (cursor + durationMinutes > 24 * 60) {
    return null;
  }
  return { startMin: cursor, endMin: cursor + durationMinutes };
}

/**
 * Verifies zero overlapping startTimeHHMM/endTimeHHMM windows exist on any calendar date.
 */
export function detectOverlappingSessions(sessions: StudySession[]): Array<{
  dateISO: string;
  firstSessionId: string;
  secondSessionId: string;
}> {
  const byDate = new Map<string, StudySession[]>();
  for (const s of sessions) {
    if (!s.startTimeHHMM || !s.endTimeHHMM || s.status === 'skipped' || s.status === 'postponed') {
      continue;
    }
    const list = byDate.get(s.dateISO) ?? [];
    list.push(s);
    byDate.set(s.dateISO, list);
  }

  const overlaps: Array<{ dateISO: string; firstSessionId: string; secondSessionId: string }> = [];
  for (const [dateISO, list] of byDate.entries()) {
    const sorted = [...list].sort(
      (a, b) => toMinutesOfDay(a.startTimeHHMM!) - toMinutesOfDay(b.startTimeHHMM!),
    );
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      if (toMinutesOfDay(curr.startTimeHHMM!) < toMinutesOfDay(prev.endTimeHHMM!)) {
        overlaps.push({ dateISO, firstSessionId: prev.id, secondSessionId: curr.id });
      }
    }
  }
  return overlaps;
}

const VALID_TRANSITIONS: Record<CompletionStatus, CompletionStatus[]> = {
  not_started: ['in_progress', 'completed', 'partially_completed', 'skipped', 'postponed'],
  in_progress: ['completed', 'partially_completed', 'skipped', 'postponed', 'not_started'],
  partially_completed: ['in_progress', 'completed', 'postponed', 'skipped'],
  postponed: ['not_started', 'in_progress', 'completed', 'skipped'],
  skipped: ['not_started', 'in_progress', 'postponed'],
  completed: ['not_started', 'in_progress'],
};

export function canTransitionSessionStatus(
  from: CompletionStatus,
  to: CompletionStatus,
): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Transitions a study session with strict lifecycle validation, duration/timestamp tracking,
 * notes, difficulty rating, and optional continuation session creation for partial completions.
 */
export function transitionStudySession(params: {
  session: StudySession;
  nextStatus: CompletionStatus;
  actualMinutes?: number;
  notes?: string;
  difficultyRating?: number | null;
  now?: string;
}): {
  updatedSession: StudySession;
  continuationSession: StudySession | null;
} {
  const {
    session,
    nextStatus,
    actualMinutes,
    notes,
    difficultyRating,
    now = new Date().toISOString(),
  } = params;

  if (!canTransitionSessionStatus(session.status, nextStatus)) {
    throw new Error(
      `Invalid study session status transition: "${session.status}" -> "${nextStatus}".`,
    );
  }

  const resolvedActual =
    actualMinutes !== undefined && Number.isFinite(actualMinutes) && actualMinutes >= 0
      ? Math.round(actualMinutes)
      : nextStatus === 'completed'
        ? session.actualMinutes > 0
          ? session.actualMinutes
          : session.plannedMinutes
        : nextStatus === 'partially_completed'
          ? Math.max(10, Math.round(session.plannedMinutes * 0.5))
          : nextStatus === 'not_started'
            ? 0
            : session.actualMinutes;

  const safeRating =
    difficultyRating !== undefined && difficultyRating !== null && Number.isFinite(difficultyRating)
      ? Math.max(1, Math.min(5, Math.round(difficultyRating)))
      : session.difficultyRating ?? null;

  const updatedSession: StudySession = {
    ...session,
    status: nextStatus,
    actualMinutes: resolvedActual,
    startedAt:
      nextStatus === 'in_progress'
        ? session.startedAt ?? now
        : nextStatus === 'not_started'
          ? null
          : session.startedAt ?? now,
    completedAt: nextStatus === 'completed' ? now : null,
    notes: notes !== undefined ? notes.trim() : session.notes,
    difficultyRating: safeRating,
  };

  let continuationSession: StudySession | null = null;
  if (nextStatus === 'partially_completed') {
    const remaining = Math.max(15, session.plannedMinutes - resolvedActual);
    if (session.plannedMinutes - resolvedActual >= 15) {
      continuationSession = {
        id: `${session.id}_cont_${Date.now()}`,
        scheduleId: session.scheduleId,
        learnerId: session.learnerId,
        goalId: session.goalId,
        dateISO: addDaysISO(session.dateISO, 1),
        startTimeHHMM: session.startTimeHHMM,
        endTimeHHMM: session.startTimeHHMM
          ? fromMinutesOfDay(toMinutesOfDay(session.startTimeHHMM) + remaining)
          : null,
        skillId: session.skillId,
        activityId: session.activityId,
        title: `${session.title} (Continuation)`,
        sessionType: session.sessionType,
        plannedMinutes: remaining,
        actualMinutes: 0,
        status: 'not_started',
        notes: 'Scheduled remaining portion after partially completed session.',
        scheduleReason: 'Carry-over remainder from partially completed session',
        startedAt: null,
        difficultyRating: null,
        completedAt: null,
      };
    }
  }

  return { updatedSession, continuationSession };
}

export function generateStudySchedule(params: GenerateScheduleParams): StudySchedule {
  const {
    scheduleId,
    learnerId,
    goalId = params.path.goalId,
    path,
    startDateISO,
    targetEndDateISO,
    availableHoursPerDay,
    studyDaysPerWeek,
    sessionLengthMinutes,
    revisionFrequencyDays = 4,
    preferredStudyDays,
    preferredStartTimeHHMM = '18:00',
    unavailableDatesISO = [],
    weeklyBudgetMinutes,
    occupiedSlotsByDate = {},
    usedMinutesByDate = {},
    scheduleMode = 'flexible',
    studyTechnique = 'spaced_blocks',
    includeBreaks = false,
    breakConfig,
    existingSessionsToPreserve = [],
  } = params;

  const conflicts: ScheduleConflict[] = [];
  const rawHoursInvalid = !Number.isFinite(availableHoursPerDay) || availableHoursPerDay <= 0;
  if (rawHoursInvalid) {
    conflicts.push({
      dateISO: startDateISO,
      reason: 'Learner daily study hours were empty or invalid; clamped cleanly to safe minimum (0.5h/day).',
      severity: 'warning',
    });
  }

  const safeHoursPerDay = !Number.isFinite(availableHoursPerDay) || availableHoursPerDay <= 0
    ? 0.5
    : Math.max(0.25, Math.min(16, availableHoursPerDay));
  const safeStudyDays =
    preferredStudyDays && preferredStudyDays.length > 0
      ? Math.min(7, Math.max(1, preferredStudyDays.length))
      : Number.isFinite(studyDaysPerWeek)
        ? Math.max(1, Math.min(7, Math.round(studyDaysPerWeek)))
        : 5;

  const dailyMinutesBudget = Math.max(15, Math.round(safeHoursPerDay * 60));
  const resolvedChunkBase = sessionLengthMinutes ?? TECHNIQUE_DEFAULT_CHUNK[studyTechnique];
  const chunkMinutes = Math.min(dailyMinutesBudget, Math.max(15, resolvedChunkBase));
  const resolvedBreaks: StudyBreakConfig = {
    ...DEFAULT_BREAK_CONFIG[studyTechnique],
    ...breakConfig,
  };
  const weeklyCap =
    weeklyBudgetMinutes !== undefined && Number.isFinite(weeklyBudgetMinutes) && weeklyBudgetMinutes > 0
      ? Math.round(weeklyBudgetMinutes)
      : dailyMinutesBudget * safeStudyDays;

  const unavailableSet = new Set(unavailableDatesISO);
  const completedActivityIds = new Set(
    existingSessionsToPreserve
      .filter((s) => s.status === 'completed' && s.activityId)
      .map((s) => s.activityId!),
  );

  // Build prerequisite-ordered queue from roadmap stages & milestones
  const queue: Array<{
    skillId: string;
    activityId: string | null;
    title: string;
    sessionType: SessionType;
    minutes: number;
    reason: string;
  }> = [];

  for (const stage of path.stages) {
    for (const milestone of stage.milestones) {
      if (milestone.status === 'completed') continue;
      const isBlockedNotice = milestone.readinessState === 'blocked';
      const baseReason = isBlockedNotice
        ? `Scheduled sequentially after verifying prerequisite(s): ${milestone.prerequisiteSkillIds.join(', ')}.`
        : milestone.reason ?? `Priority milestone in ${stage.title}.`;

      if (milestone.activities.length > 0) {
        for (const act of milestone.activities) {
          if (act.status === 'completed' || completedActivityIds.has(act.id)) continue;
          const mappedType: SessionType =
            act.type === 'quiz' || act.type === 'mcq'
              ? 'assessment'
              : act.type === 'project'
                ? 'project'
                : act.type === 'revision' || act.type === 'flashcard'
                  ? 'revision'
                  : 'topic';
          queue.push({
            skillId: act.skillId,
            activityId: act.id,
            title: act.title,
            sessionType: mappedType,
            minutes: Math.max(15, act.estimatedMinutes),
            reason: act.reason ?? baseReason,
          });
        }
      } else {
        queue.push({
          skillId: milestone.skillIds[0] ?? 'general',
          activityId: null,
          title: milestone.title,
          sessionType: 'topic',
          minutes: Math.max(30, Math.round(milestone.estimatedHours * 60)),
          reason: baseReason,
        });
      }
      queue.push({
        skillId: milestone.skillIds[0] ?? 'general',
        activityId: null,
        title: `Milestone Check: ${milestone.title}`,
        sessionType: 'assessment',
        minutes: 30,
        reason: `Verifies milestone proficiency before advancing (${milestone.completionCriteria}).`,
      });
    }
  }

  const sessions: StudySession[] = [...existingSessionsToPreserve];
  const dateMinutesUsed = new Map<string, number>(Object.entries(usedMinutesByDate));
  const weekMinutesUsed = new Map<string, number>();
  const slotsMap = new Map<string, OccupiedSlot[]>();
  for (const [k, v] of Object.entries(occupiedSlotsByDate)) {
    slotsMap.set(k, [...v]);
  }
  for (const existing of existingSessionsToPreserve) {
    if (existing.sessionType !== 'break' && existing.status !== 'skipped' && existing.status !== 'postponed') {
      dateMinutesUsed.set(existing.dateISO, (dateMinutesUsed.get(existing.dateISO) ?? 0) + existing.plannedMinutes);
      const wk = getMondayWeekKey(existing.dateISO);
      weekMinutesUsed.set(wk, (weekMinutesUsed.get(wk) ?? 0) + existing.plannedMinutes);
    }
    if (existing.startTimeHHMM && existing.endTimeHHMM) {
      const arr = slotsMap.get(existing.dateISO) ?? [];
      arr.push({ startHHMM: existing.startTimeHHMM, endHHMM: existing.endTimeHHMM });
      slotsMap.set(existing.dateISO, arr);
    }
  }

  const preferredStartMin = toMinutesOfDay(preferredStartTimeHHMM ?? '18:00');
  let dayOffset = 0;
  let studyDayCount = 0;
  let sessionCounter = 1;
  let blocksOnDay = 0;
  let safetyLoop = 0;

  const findInitialDate = (): string => {
    while (safetyLoop < 730) {
      const candidate = addDaysISO(startDateISO, dayOffset);
      if (isAllowedStudyDate(candidate, startDateISO, safeStudyDays, preferredStudyDays, unavailableSet)) {
        const usedToday = dateMinutesUsed.get(candidate) ?? 0;
        const wkUsed = weekMinutesUsed.get(getMondayWeekKey(candidate)) ?? 0;
        if (dailyMinutesBudget - usedToday >= 15 && weeklyCap - wkUsed >= 15) {
          return candidate;
        }
      }
      dayOffset += 1;
      safetyLoop += 1;
    }
    return startDateISO;
  };

  let currentDate = findInitialDate();

  const advanceToNextAvailableDay = () => {
    blocksOnDay = 0;
    dayOffset += 1;
    while (safetyLoop < 730) {
      const candidate = addDaysISO(startDateISO, dayOffset);
      if (isAllowedStudyDate(candidate, startDateISO, safeStudyDays, preferredStudyDays, unavailableSet)) {
        const usedToday = dateMinutesUsed.get(candidate) ?? 0;
        const wkUsed = weekMinutesUsed.get(getMondayWeekKey(candidate)) ?? 0;
        if (dailyMinutesBudget - usedToday >= 15 && weeklyCap - wkUsed >= 15) {
          studyDayCount += 1;
          currentDate = candidate;
          return;
        }
      }
      dayOffset += 1;
      safetyLoop += 1;
    }
    currentDate = addDaysISO(startDateISO, dayOffset);
  };

  const reserveSlotAndPush = (
    item: Omit<StudySession, 'id' | 'scheduleId' | 'learnerId' | 'goalId'>,
  ): boolean => {
    const usedToday = dateMinutesUsed.get(currentDate) ?? 0;
    const wkKey = getMondayWeekKey(currentDate);
    const wkUsed = weekMinutesUsed.get(wkKey) ?? 0;

    if (item.sessionType !== 'break') {
      if (usedToday + item.plannedMinutes > dailyMinutesBudget || wkUsed + item.plannedMinutes > weeklyCap) {
        return false;
      }
    }

    const occupied = slotsMap.get(currentDate) ?? [];
    const slot = findNextFreeSlot(preferredStartMin, item.plannedMinutes, occupied);
    if (!slot) {
      return false;
    }

    const startTimeHHMM = fromMinutesOfDay(slot.startMin);
    const endTimeHHMM = fromMinutesOfDay(slot.endMin);
    occupied.push({ startHHMM: startTimeHHMM, endHHMM: endTimeHHMM });
    slotsMap.set(currentDate, occupied);

    if (item.sessionType !== 'break') {
      dateMinutesUsed.set(currentDate, usedToday + item.plannedMinutes);
      weekMinutesUsed.set(wkKey, wkUsed + item.plannedMinutes);
    }

    sessions.push({
      id: `${scheduleId}_s_${sessionCounter++}`,
      scheduleId,
      learnerId,
      goalId,
      ...item,
      startTimeHHMM,
      endTimeHHMM,
    });
    return true;
  };

  let recentSkillId: string | null = null;
  for (const item of queue) {
    let remainingTaskMinutes = item.minutes;
    recentSkillId = item.skillId;

    while (remainingTaskMinutes > 0 && safetyLoop < 730) {
      const usedToday = dateMinutesUsed.get(currentDate) ?? 0;
      const wkUsed = weekMinutesUsed.get(getMondayWeekKey(currentDate)) ?? 0;
      const availToday = Math.min(dailyMinutesBudget - usedToday, weeklyCap - wkUsed);

      if (availToday < 15) {
        advanceToNextAvailableDay();
        if (studyDayCount > 0 && studyDayCount % revisionFrequencyDays === 0 && recentSkillId) {
          const revMin = Math.min(30, dailyMinutesBudget - (dateMinutesUsed.get(currentDate) ?? 0));
          if (revMin >= 15) {
            reserveSlotAndPush({
              dateISO: currentDate,
              skillId: recentSkillId,
              activityId: null,
              title: `Spaced Revision: ${item.title}`,
              sessionType: 'revision',
              plannedMinutes: revMin,
              actualMinutes: 0,
              status: 'not_started',
              notes: '',
              scheduleReason: `Scheduled spaced revision interval (every ${revisionFrequencyDays} study days).`,
              startedAt: null,
              difficultyRating: null,
              completedAt: null,
            });
          }
        }
        continue;
      }

      const slice = Math.min(remainingTaskMinutes, chunkMinutes, availToday);
      if (slice <= 0) {
        advanceToNextAvailableDay();
        continue;
      }

      const placed = reserveSlotAndPush({
        dateISO: currentDate,
        skillId: item.skillId,
        activityId: item.activityId,
        title: item.title,
        sessionType: item.sessionType,
        plannedMinutes: slice,
        actualMinutes: 0,
        status: 'not_started',
        notes: '',
        scheduleReason: item.reason,
        startedAt: null,
        difficultyRating: null,
        completedAt: null,
      });

      if (!placed) {
        advanceToNextAvailableDay();
        continue;
      }

      remainingTaskMinutes -= slice;
      blocksOnDay += 1;

      if (includeBreaks && remainingTaskMinutes > 0) {
        const isLongBreak = blocksOnDay % resolvedBreaks.sessionsBeforeLongBreak === 0;
        const breakLen = isLongBreak
          ? resolvedBreaks.longBreakMinutes
          : resolvedBreaks.shortBreakMinutes;
        if (breakLen > 0) {
          reserveSlotAndPush({
            dateISO: currentDate,
            skillId: item.skillId,
            activityId: null,
            title: isLongBreak ? `Long Break (${studyTechnique})` : `Short Break (${studyTechnique})`,
            sessionType: 'break',
            plannedMinutes: breakLen,
            actualMinutes: 0,
            status: 'not_started',
            notes: '',
            scheduleReason: `Automatic recovery break under ${studyTechnique} routine.`,
            startedAt: null,
            difficultyRating: null,
            completedAt: null,
          });
        }
      }
    }
  }

  const studySessionsOnly = sessions.filter((s) => s.sessionType !== 'break');
  const computedEndDateISO =
    studySessionsOnly.length > 0
      ? studySessionsOnly[studySessionsOnly.length - 1]!.dateISO
      : startDateISO;
  const totalPlannedMinutes = studySessionsOnly.reduce((acc, s) => acc + s.plannedMinutes, 0);
  const totalPlannedHours = Number((totalPlannedMinutes / 60).toFixed(1));

  let isRealistic = true;
  let feasibilityWarning: string | null = null;

  if (targetEndDateISO) {
    if (targetEndDateISO < startDateISO) {
      isRealistic = false;
      feasibilityWarning = `Target completion date (${targetEndDateISO}) precedes start date (${startDateISO}). Earliest completion is ${computedEndDateISO}.`;
      conflicts.push({ dateISO: targetEndDateISO, reason: feasibilityWarning, severity: 'overload' });
    } else {
      const availableCalendarDays = diffDaysISO(startDateISO, targetEndDateISO);
      const weeklyCapacityMinutes = dailyMinutesBudget * safeStudyDays;
      const availableWeeks = Math.max(1 / 7, availableCalendarDays / 7);
      const capacityMinutes = Math.round(availableWeeks * weeklyCapacityMinutes);

      if (totalPlannedMinutes > capacityMinutes || computedEndDateISO > targetEndDateISO) {
        isRealistic = false;
        const requiredDailyHours = Number(
          (
            totalPlannedMinutes /
            60 /
            Math.max(1, Math.ceil((availableCalendarDays * safeStudyDays) / 7))
          ).toFixed(1),
        );
        feasibilityWarning = `Target completion (${targetEndDateISO}) is unrealistic at ${safeHoursPerDay}h/day. Planned workload (${totalPlannedHours}h) completes on ${computedEndDateISO}, or requires ~${requiredDailyHours}h/study day.`;
        conflicts.push({ dateISO: targetEndDateISO, reason: feasibilityWarning, severity: 'overload' });
      }
    }
  }

  const now = new Date().toISOString();
  return {
    id: scheduleId,
    learnerId,
    pathId: path.id,
    startDateISO,
    targetEndDateISO: targetEndDateISO ?? computedEndDateISO,
    dailyAvailableMinutes: dailyMinutesBudget,
    isRealistic,
    feasibilityWarning,
    totalPlannedHours,
    scheduleMode,
    studyTechnique,
    breakConfig: resolvedBreaks,
    conflicts,
    schedulingSummary: `Generated ${studySessionsOnly.length} non-overlapping study sessions (${studyTechnique}, ${scheduleMode}) across ${safeStudyDays} study day(s)/week.`,
    sessions,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Coordinates schedules across multiple simultaneous active goals without overlaps or exceeding
 * combined daily/weekly learner availability.
 */
export function generateMultiGoalStudySchedule(params: {
  learnerId: string;
  goals: LearningGoal[];
  paths: LearningPath[];
  startDateISO: string;
  availableHoursPerDay: number;
  studyDaysPerWeek: number;
  preferredStudyDays?: number[];
  preferredStartTimeHHMM?: string;
  unavailableDatesISO?: string[];
  studyTechnique?: StudyTechnique;
  includeBreaks?: boolean;
}): MultiGoalScheduleReport {
  const {
    learnerId,
    goals,
    paths,
    startDateISO,
    availableHoursPerDay,
    studyDaysPerWeek,
    preferredStudyDays,
    preferredStartTimeHHMM = '18:00',
    unavailableDatesISO = [],
    studyTechnique = 'spaced_blocks',
    includeBreaks = false,
  } = params;

  const safeDaily = Math.max(0.25, Math.min(16, Number.isFinite(availableHoursPerDay) && availableHoursPerDay > 0 ? availableHoursPerDay : 1));
  const safeDays = Math.max(1, Math.min(7, Math.round(studyDaysPerWeek)));
  const dailyBudgetMin = Math.round(safeDaily * 60);
  const weeklyBudgetMin = dailyBudgetMin * safeDays;

  const priorityRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const orderedGoals = [...goals]
    .filter((g) => (g.status ? g.status === 'active' : g.isActive))
    .sort((a, b) => (priorityRank[b.priority ?? 'medium'] ?? 2) - (priorityRank[a.priority ?? 'medium'] ?? 2));

  const sharedUsedMinutes: Record<string, number> = {};
  const sharedOccupiedSlots: Record<string, OccupiedSlot[]> = {};
  const schedules: StudySchedule[] = [];
  const allSessions: StudySession[] = [];
  const overloadWarnings: string[] = [];

  for (const goal of orderedGoals) {
    const path = paths.find((p) => p.goalId === goal.id);
    if (!path) continue;
    const sched = generateStudySchedule({
      scheduleId: `sched_${goal.id}`,
      learnerId,
      goalId: goal.id,
      path,
      startDateISO,
      targetEndDateISO: goal.targetCompletionDate ?? null,
      availableHoursPerDay: safeDaily,
      studyDaysPerWeek: safeDays,
      preferredStudyDays,
      preferredStartTimeHHMM,
      unavailableDatesISO,
      weeklyBudgetMinutes: weeklyBudgetMin,
      usedMinutesByDate: sharedUsedMinutes,
      occupiedSlotsByDate: sharedOccupiedSlots,
      studyTechnique,
      includeBreaks,
    });
    schedules.push(sched);
    if (!sched.isRealistic && sched.feasibilityWarning) {
      overloadWarnings.push(`${goal.title}: ${sched.feasibilityWarning}`);
    }

    for (const s of sched.sessions) {
      allSessions.push(s);
      if (s.sessionType !== 'break') {
        sharedUsedMinutes[s.dateISO] = (sharedUsedMinutes[s.dateISO] ?? 0) + s.plannedMinutes;
      }
      if (s.startTimeHHMM && s.endTimeHHMM) {
        const list = sharedOccupiedSlots[s.dateISO] ?? [];
        list.push({ startHHMM: s.startTimeHHMM, endHHMM: s.endTimeHHMM });
        sharedOccupiedSlots[s.dateISO] = list;
      }
    }
  }

  return {
    combinedDailyBudgetMinutes: dailyBudgetMin,
    combinedWeeklyCapacityMinutes: weeklyBudgetMin,
    isRealistic: overloadWarnings.length === 0,
    overloadWarnings,
    schedules,
    allSessions: allSessions.sort((a, b) => a.dateISO.localeCompare(b.dateISO)),
  };
}

/**
 * Reschedules missed/overdue and postponed sessions cleanly without touching completed sessions.
 */
export function recalculateScheduleForMissedSessions(
  schedule: StudySchedule,
  referenceDateISO: string,
  studyDaysPerWeek: number,
  options?: {
    dailyBudgetOverrideMinutes?: number;
    unavailableDatesISO?: string[];
    preferredStartTimeHHMM?: string;
    preferredStudyDays?: number[];
  },
): StudySchedule {
  const dailyBudget = Math.max(
    15,
    options?.dailyBudgetOverrideMinutes ?? schedule.dailyAvailableMinutes,
  );
  const unavailableSet = new Set(options?.unavailableDatesISO ?? []);
  const startMinDefault = toMinutesOfDay(options?.preferredStartTimeHHMM ?? '18:00');

  const preservedOrFuture = schedule.sessions.filter(
    (s) =>
      s.status === 'completed' ||
      s.status === 'skipped' ||
      (s.status !== 'postponed' && s.dateISO >= referenceDateISO && !unavailableSet.has(s.dateISO)),
  );
  const toMove = schedule.sessions.filter(
    (s) =>
      s.status !== 'completed' &&
      s.status !== 'skipped' &&
      s.sessionType !== 'break' &&
      (s.status === 'postponed' || s.dateISO < referenceDateISO || unavailableSet.has(s.dateISO)),
  );

  if (toMove.length === 0) return schedule;

  const usedByDate = new Map<string, number>();
  const slotsByDate = new Map<string, OccupiedSlot[]>();
  for (const s of preservedOrFuture) {
    if (s.sessionType !== 'break') {
      usedByDate.set(s.dateISO, (usedByDate.get(s.dateISO) ?? 0) + s.plannedMinutes);
    }
    if (s.startTimeHHMM && s.endTimeHHMM) {
      const list = slotsByDate.get(s.dateISO) ?? [];
      list.push({ startHHMM: s.startTimeHHMM, endHHMM: s.endTimeHHMM });
      slotsByDate.set(s.dateISO, list);
    }
  }

  let dayOffset = 0;
  const relocated: StudySession[] = [];
  for (const missed of toMove) {
    let safety = 0;
    while (safety < 365) {
      const candidate = addDaysISO(referenceDateISO, dayOffset);
      if (
        !isAllowedStudyDate(
          candidate,
          schedule.startDateISO,
          studyDaysPerWeek,
          options?.preferredStudyDays,
          unavailableSet,
        )
      ) {
        dayOffset += 1;
        safety += 1;
        continue;
      }
      const used = usedByDate.get(candidate) ?? 0;
      const occupied = slotsByDate.get(candidate) ?? [];
      const slot = findNextFreeSlot(startMinDefault, missed.plannedMinutes, occupied);
      if ((used + missed.plannedMinutes <= dailyBudget || used === 0) && slot) {
        usedByDate.set(candidate, used + missed.plannedMinutes);
        occupied.push({
          startHHMM: fromMinutesOfDay(slot.startMin),
          endHHMM: fromMinutesOfDay(slot.endMin),
        });
        slotsByDate.set(candidate, occupied);
        relocated.push({
          ...missed,
          status: missed.status === 'postponed' ? 'not_started' : missed.status,
          dateISO: candidate,
          startTimeHHMM: fromMinutesOfDay(slot.startMin),
          endTimeHHMM: fromMinutesOfDay(slot.endMin),
          notes: missed.notes ? `${missed.notes} (Rescheduled)` : 'Rescheduled from missed/postponed slot',
          scheduleReason: `Automatically rescheduled cleanly into ${candidate} without exceeding daily capacity.`,
        });
        break;
      }
      dayOffset += 1;
      safety += 1;
    }
  }

  const merged = [...preservedOrFuture, ...relocated].sort((a, b) =>
    a.dateISO.localeCompare(b.dateISO),
  );
  return {
    ...schedule,
    dailyAvailableMinutes: dailyBudget,
    sessions: merged,
    schedulingSummary: `Rescheduled ${relocated.length} unfinished session(s) cleanly from ${referenceDateISO}.`,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Generates a non-destructive preview before applying missed/postponed/availability revisions.
 */
export function previewScheduleRevision(params: {
  schedule: StudySchedule;
  referenceDateISO: string;
  studyDaysPerWeek: number;
  dailyBudgetOverrideMinutes?: number;
  unavailableDatesISO?: string[];
  preferredStartTimeHHMM?: string;
  preferredStudyDays?: number[];
}): { preview: ScheduleRevisionPreview; revisedSchedule: StudySchedule } {
  const revisedSchedule = recalculateScheduleForMissedSessions(
    params.schedule,
    params.referenceDateISO,
    params.studyDaysPerWeek,
    {
      dailyBudgetOverrideMinutes: params.dailyBudgetOverrideMinutes,
      unavailableDatesISO: params.unavailableDatesISO,
      preferredStartTimeHHMM: params.preferredStartTimeHHMM,
      preferredStudyDays: params.preferredStudyDays,
    },
  );

  const preservedCompletedCount = revisedSchedule.sessions.filter(
    (s) => s.status === 'completed' || s.status === 'partially_completed',
  ).length;
  const movedSessions = revisedSchedule.sessions.filter((revised) => {
    const orig = params.schedule.sessions.find((o) => o.id === revised.id);
    return orig && orig.dateISO !== revised.dateISO;
  });

  const studyOnlyOld = params.schedule.sessions.filter((s) => s.sessionType !== 'break');
  const studyOnlyNew = revisedSchedule.sessions.filter((s) => s.sessionType !== 'break');
  const previousEndDateISO =
    studyOnlyOld.length > 0 ? studyOnlyOld[studyOnlyOld.length - 1]!.dateISO : params.schedule.targetEndDateISO;
  const newEndDateISO =
    studyOnlyNew.length > 0 ? studyOnlyNew[studyOnlyNew.length - 1]!.dateISO : params.schedule.targetEndDateISO;

  return {
    revisedSchedule,
    preview: {
      preservedCompletedCount,
      movedMissedOrPostponedCount: movedSessions.length,
      previousEndDateISO,
      newEndDateISO,
      dailyBudgetMinutes: revisedSchedule.dailyAvailableMinutes,
      conflicts: revisedSchedule.conflicts ?? [],
      summary: `Moves ${movedSessions.length} missed/postponed session(s), preserves ${preservedCompletedCount} completed/partial history record(s), and finishes by ${newEndDateISO}.`,
    },
  };
}

export function getDailySessions(sessions: StudySession[], dateISO: string): StudySession[] {
  return sessions
    .filter((s) => s.dateISO === dateISO)
    .sort((a, b) =>
      a.startTimeHHMM && b.startTimeHHMM
        ? toMinutesOfDay(a.startTimeHHMM) - toMinutesOfDay(b.startTimeHHMM)
        : 0,
    );
}

export function getWeeklyBuckets(sessions: StudySession[]): WeeklyPlanBucket[] {
  const sorted = [...sessions]
    .filter((s) => s.sessionType !== 'break')
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  if (sorted.length === 0) return [];

  const buckets = new Map<string, WeeklyPlanBucket>();
  for (const s of sorted) {
    const dt = new Date(`${s.dateISO}T00:00:00Z`);
    const day = dt.getUTCDay();
    const diffToMon = (day + 6) % 7;
    const weekStartISO = addDaysISO(s.dateISO, -diffToMon);
    const weekEndISO = addDaysISO(weekStartISO, 6);
    const existing = buckets.get(weekStartISO) ?? {
      weekStartISO,
      weekEndISO,
      totalMinutes: 0,
      completedMinutes: 0,
      sessions: [],
    };
    existing.totalMinutes += s.plannedMinutes;
    if (s.status === 'completed' || s.status === 'partially_completed') {
      existing.completedMinutes += s.actualMinutes > 0 ? s.actualMinutes : s.plannedMinutes;
    }
    existing.sessions.push(s);
    buckets.set(weekStartISO, existing);
  }
  return Array.from(buckets.values());
}

export function getMonthlyTargets(sessions: StudySession[]): MonthlyTargetSummary[] {
  const map = new Map<string, MonthlyTargetSummary & { skills: Set<string> }>();
  for (const s of sessions) {
    if (s.sessionType === 'break') continue;
    const monthKey = s.dateISO.slice(0, 7);
    const current = map.get(monthKey) ?? {
      monthKey,
      totalPlannedHours: 0,
      completedHours: 0,
      sessionsCount: 0,
      completedCount: 0,
      focusSkills: [],
      skills: new Set<string>(),
    };
    current.totalPlannedHours += s.plannedMinutes / 60;
    current.sessionsCount += 1;
    if (s.status === 'completed' || s.status === 'partially_completed') {
      if (s.status === 'completed') current.completedCount += 1;
      current.completedHours += (s.actualMinutes > 0 ? s.actualMinutes : s.plannedMinutes) / 60;
    }
    current.skills.add(s.skillId);
    map.set(monthKey, current);
  }
  return Array.from(map.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map(({ skills, ...rest }) => ({
      ...rest,
      totalPlannedHours: Number(rest.totalPlannedHours.toFixed(1)),
      completedHours: Number(rest.completedHours.toFixed(1)),
      focusSkills: Array.from(skills),
    }));
}
