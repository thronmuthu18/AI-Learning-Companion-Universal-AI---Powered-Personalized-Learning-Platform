import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildPersonalizedLearningPath,
  createLearningGoal,
} from '@alc/learning-engine';
import {
  canTransitionSessionStatus,
  detectOverlappingSessions,
  generateMultiGoalStudySchedule,
  generateStudySchedule,
  getDailySessions,
  getMonthlyTargets,
  getWeeklyBuckets,
  previewScheduleRevision,
  recalculateScheduleForMissedSessions,
  transitionStudySession,
} from '@alc/study-planner';
import { BUNDLED_LEARNING_RESOURCES } from '@alc/resource-management';
import {
  createDefaultSettings,
  exportSnapshotToBackup,
  validateAndParseImportBackup,
} from '@alc/storage';
import type { GoalCategory, GoalPriority, LearnerProfile } from '@alc/shared-types';
import { IndexedDBLearningRepository } from '../apps/web/src/storage/indexeddb-repository';

function makeProfile(overrides: Partial<LearnerProfile> = {}): LearnerProfile {
  return {
    id: 'prof_p13',
    learnerId: 'u_p13',
    educationalBackground: 'University Graduate',
    academicLevel: 'undergraduate',
    interests: ['Electronics', 'Physics', 'Accounting', 'Competitive Exams', 'Python', 'Design'],
    careerAspirations: 'Build mastery across diverse domains',
    selfReportedSkills: [],
    targetSkills: [],
    availableHoursPerDay: 2,
    studyDaysPerWeek: 5,
    preferredFormat: 'mixed',
    preferredLanguage: 'English',
    targetCompletionDate: null,
    learningPreferences: {
      sessionLengthMinutes: 45,
      revisionFrequencyDays: 4,
      dailyReminderTime: '18:00',
    },
    history: [],
    updatedAt: '2026-11-25T00:00:00Z',
    ...overrides,
  };
}

function makeGoal(params: {
  id: string;
  learnerId: string;
  category: GoalCategory;
  domainId: string;
  targetSkillIds: string[];
  priority?: GoalPriority;
}) {
  return createLearningGoal({
    id: params.id,
    learnerId: params.learnerId,
    category: params.category,
    domainId: params.domainId,
    title: `${params.category} Plan`,
    rawDescription: `Structured study plan for ${params.category}`,
    structuredObjectives: [`Master ${params.targetSkillIds.join(', ')}`],
    targetSkillIds: params.targetSkillIds,
    priority: params.priority,
    interpretedByAI: false,
  });
}

describe('Phase 13 — Intelligent Study Planner (Module G)', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('respects daily/weekly caps, prerequisite order, blackout dates, preferred days, and has zero overlaps across 6 domains', () => {
    const profile = makeProfile({ availableHoursPerDay: 2, studyDaysPerWeek: 5 });
    const domains = [
      { category: 'gate_ece', domainId: 'dom_ece', target: 'ece-control-comm' },
      { category: 'physics_mastery', domainId: 'dom_physics_chem', target: 'phys-quantum-intro' },
      { category: 'business_accounting', domainId: 'dom_accounting', target: 'acct-cost-managerial' },
      { category: 'competitive_exams', domainId: 'dom_competitive_exams', target: 'exam-strategy' },
      { category: 'python_programming', domainId: 'dom_programming', target: 'python-core' },
      { category: 'graphic_design', domainId: 'dom_design', target: 'design-layout-hierarchy' },
    ];

    for (const d of domains) {
      const goal = makeGoal({
        id: `g_${d.target}`,
        learnerId: profile.learnerId,
        category: d.category,
        domainId: d.domainId,
        targetSkillIds: [d.target],
      });
      const path = buildPersonalizedLearningPath({
        pathId: `p_${d.target}`,
        learnerId: profile.learnerId,
        goal,
        profile,
        learnerSkills: [],
        resources: BUNDLED_LEARNING_RESOURCES,
        startDateISO: '2026-12-01',
      });

      const schedule = generateStudySchedule({
        scheduleId: `sched_${d.target}`,
        learnerId: profile.learnerId,
        goalId: goal.id,
        path,
        startDateISO: '2026-12-01',
        targetEndDateISO: null,
        availableHoursPerDay: 2,
        studyDaysPerWeek: 5,
        preferredStudyDays: [1, 2, 3, 4, 5],
        preferredStartTimeHHMM: '18:30',
        unavailableDatesISO: ['2026-12-02', '2026-12-04'],
        studyTechnique: 'pomodoro',
        includeBreaks: true,
      });

      expect(schedule.sessions.length).toBeGreaterThan(0);
      expect(detectOverlappingSessions(schedule.sessions)).toEqual([]);

      expect(getDailySessions(schedule.sessions, '2026-12-02')).toHaveLength(0);
      expect(getDailySessions(schedule.sessions, '2026-12-04')).toHaveLength(0);

      const buckets = getWeeklyBuckets(schedule.sessions);
      for (const b of buckets) {
        expect(b.totalMinutes).toBeLessThanOrEqual(2 * 60 * 5);
      }

      const byDate = new Map<string, number>();
      for (const s of schedule.sessions) {
        if (s.sessionType === 'break') continue;
        byDate.set(s.dateISO, (byDate.get(s.dateISO) ?? 0) + s.plannedMinutes);
        const [yy, mm, dd] = s.dateISO.split('-').map(Number);
        const day = new Date(Date.UTC(yy!, mm! - 1, dd!)).getUTCDay();
        expect([1, 2, 3, 4, 5]).toContain(day);
      }
      for (const mins of byDate.values()) {
        expect(mins).toBeLessThanOrEqual(120);
      }

      expect(schedule.sessions.some((s) => s.sessionType === 'break')).toBe(true);
      expect(schedule.studyTechnique).toBe('pomodoro');

      const topicSessions = schedule.sessions.filter((s) => s.sessionType === 'topic');
      const firstTopicSkill = topicSessions[0]!.skillId;
      expect(firstTopicSkill).not.toBe(d.target);
    }
  });

  it('coordinates multi-goal priority scheduling without date/time overlaps or combined overload', () => {
    const profile = makeProfile({ availableHoursPerDay: 2, studyDaysPerWeek: 5 });
    const highGoal = makeGoal({
      id: 'g_ece_hi',
      learnerId: profile.learnerId,
      category: 'gate_ece',
      domainId: 'dom_ece',
      targetSkillIds: ['ece-signals-systems'],
      priority: 'high',
    });
    const lowGoal = makeGoal({
      id: 'g_acct_lo',
      learnerId: profile.learnerId,
      category: 'business_accounting',
      domainId: 'dom_accounting',
      targetSkillIds: ['acct-statements'],
      priority: 'low',
    });

    const pHigh = buildPersonalizedLearningPath({
      pathId: 'p_ece_hi',
      learnerId: profile.learnerId,
      goal: highGoal,
      profile,
      learnerSkills: [],
      resources: BUNDLED_LEARNING_RESOURCES,
      startDateISO: '2026-12-01',
    });
    const pLow = buildPersonalizedLearningPath({
      pathId: 'p_acct_lo',
      learnerId: profile.learnerId,
      goal: lowGoal,
      profile,
      learnerSkills: [],
      resources: BUNDLED_LEARNING_RESOURCES,
      startDateISO: '2026-12-01',
    });

    const report = generateMultiGoalStudySchedule({
      learnerId: profile.learnerId,
      goals: [lowGoal, highGoal],
      paths: [pLow, pHigh],
      startDateISO: '2026-12-01',
      availableHoursPerDay: 2,
      studyDaysPerWeek: 5,
      preferredStartTimeHHMM: '18:00',
    });

    expect(report.schedules).toHaveLength(2);
    expect(report.schedules[0]!.sessions[0]!.goalId).toBe('g_ece_hi');
    expect(detectOverlappingSessions(report.allSessions)).toEqual([]);

    const combinedDaily = new Map<string, number>();
    for (const s of report.allSessions) {
      if (s.sessionType === 'break') continue;
      combinedDaily.set(s.dateISO, (combinedDaily.get(s.dateISO) ?? 0) + s.plannedMinutes);
    }
    for (const mins of combinedDaily.values()) {
      expect(mins).toBeLessThanOrEqual(120);
    }
  });

  it('enforces valid session lifecycle transitions, captures notes/ratings, and splits partial completion remainders', () => {
    const profile = makeProfile();
    const goal = makeGoal({
      id: 'g_phys',
      learnerId: profile.learnerId,
      category: 'physics_mastery',
      domainId: 'dom_physics_chem',
      targetSkillIds: ['phys-mechanics'],
    });
    const path = buildPersonalizedLearningPath({
      pathId: 'p_phys',
      learnerId: profile.learnerId,
      goal,
      profile,
      learnerSkills: [],
      resources: BUNDLED_LEARNING_RESOURCES,
      startDateISO: '2026-12-01',
    });
    const schedule = generateStudySchedule({
      scheduleId: 'sched_phys',
      learnerId: profile.learnerId,
      goalId: goal.id,
      path,
      startDateISO: '2026-12-01',
      targetEndDateISO: null,
      availableHoursPerDay: 2,
      studyDaysPerWeek: 5,
      studyTechnique: 'deep_focus',
    });
    const first = schedule.sessions.find((s) => s.plannedMinutes >= 60)!;

    expect(canTransitionSessionStatus('completed', 'skipped')).toBe(false);
    expect(() =>
      transitionStudySession({
        session: { ...first, status: 'completed' },
        nextStatus: 'skipped',
      }),
    ).toThrow(/Invalid study session status transition/);

    const started = transitionStudySession({
      session: first,
      nextStatus: 'in_progress',
      now: '2026-12-01T18:05:00Z',
    });
    expect(started.updatedSession.status).toBe('in_progress');
    expect(started.updatedSession.startedAt).toBe('2026-12-01T18:05:00Z');

    const partial = transitionStudySession({
      session: started.updatedSession,
      nextStatus: 'partially_completed',
      actualMinutes: 25,
      notes: 'Completed vectors, need kinematics examples',
      difficultyRating: 4,
      now: '2026-12-01T18:30:00Z',
    });
    expect(partial.updatedSession.status).toBe('partially_completed');
    expect(partial.updatedSession.actualMinutes).toBe(25);
    expect(partial.updatedSession.difficultyRating).toBe(4);
    expect(partial.updatedSession.notes).toContain('vectors');
    expect(partial.continuationSession).not.toBeNull();
    expect(partial.continuationSession!.plannedMinutes).toBe(first.plannedMinutes - 25);
  });

  it('previews and executes adaptive rescheduling for missed/postponed sessions while preserving completed history', () => {
    const profile = makeProfile();
    const goal = makeGoal({
      id: 'g_py',
      learnerId: profile.learnerId,
      category: 'python_programming',
      domainId: 'dom_programming',
      targetSkillIds: ['python-core'],
    });
    const path = buildPersonalizedLearningPath({
      pathId: 'p_py',
      learnerId: profile.learnerId,
      goal,
      profile,
      learnerSkills: [],
      resources: BUNDLED_LEARNING_RESOURCES,
      startDateISO: '2026-12-01',
    });
    const schedule = generateStudySchedule({
      scheduleId: 'sched_py',
      learnerId: profile.learnerId,
      goalId: goal.id,
      path,
      startDateISO: '2026-12-01',
      targetEndDateISO: null,
      availableHoursPerDay: 2,
      studyDaysPerWeek: 5,
    });

    const firstStudyIdx = schedule.sessions.findIndex((s) => s.sessionType !== 'break');
    const secondStudyIdx = schedule.sessions.findIndex(
      (s, i) => i > firstStudyIdx && s.sessionType !== 'break',
    );
    const mutated = {
      ...schedule,
      sessions: schedule.sessions.map((s, idx) => {
        if (idx === firstStudyIdx) {
          return {
            ...s,
            status: 'completed' as const,
            actualMinutes: s.plannedMinutes,
            completedAt: '2026-12-01T19:00:00Z',
          };
        }
        if (idx === secondStudyIdx) {
          return { ...s, status: 'postponed' as const };
        }
        return s;
      }),
    };

    const { preview, revisedSchedule } = previewScheduleRevision({
      schedule: mutated,
      referenceDateISO: '2026-12-08',
      studyDaysPerWeek: 5,
      dailyBudgetOverrideMinutes: 90,
      unavailableDatesISO: ['2026-12-09'],
    });

    expect(preview.preservedCompletedCount).toBe(1);
    expect(preview.movedMissedOrPostponedCount).toBeGreaterThan(0);
    expect(preview.dailyBudgetMinutes).toBe(90);

    const completedPreserved = revisedSchedule.sessions.find(
      (s) => s.id === mutated.sessions[firstStudyIdx]!.id,
    )!;
    expect(completedPreserved.status).toBe('completed');
    expect(completedPreserved.dateISO).toBe(mutated.sessions[firstStudyIdx]!.dateISO);

    const incomplete = revisedSchedule.sessions.filter(
      (s) => s.status !== 'completed' && s.status !== 'skipped' && s.sessionType !== 'break',
    );
    for (const s of incomplete) {
      expect(s.dateISO >= '2026-12-08').toBe(true);
      expect(s.dateISO).not.toBe('2026-12-09');
    }

    const monthly = getMonthlyTargets(revisedSchedule.sessions);
    expect(monthly.length).toBeGreaterThan(0);
  });

  it('safely warns on unrealistic deadlines and empty/invalid availability without throwing', () => {
    const profile = makeProfile();
    const goal = makeGoal({
      id: 'g_design',
      learnerId: profile.learnerId,
      category: 'graphic_design',
      domainId: 'dom_design',
      targetSkillIds: ['design-layout-hierarchy'],
    });
    const path = buildPersonalizedLearningPath({
      pathId: 'p_design',
      learnerId: profile.learnerId,
      goal,
      profile,
      learnerSkills: [],
      resources: BUNDLED_LEARNING_RESOURCES,
      startDateISO: '2026-12-01',
    });

    const tight = generateStudySchedule({
      scheduleId: 'sched_tight',
      learnerId: profile.learnerId,
      path,
      startDateISO: '2026-12-01',
      targetEndDateISO: '2026-12-01',
      availableHoursPerDay: 0,
      studyDaysPerWeek: 5,
    });

    expect(tight.isRealistic).toBe(false);
    expect(tight.feasibilityWarning).toBeTruthy();
    expect((tight.conflicts ?? []).length).toBeGreaterThanOrEqual(2);
    expect(tight.dailyAvailableMinutes).toBe(30);
    expect(tight.sessions.length).toBeGreaterThan(0);
  });

  it('persists Phase 13 schedule metadata, breaks, ratings, and continuations through IndexedDB and SHA-256 backup import', async () => {
    const repo = new IndexedDBLearningRepository();
    await repo.initialize();
    const profile = makeProfile();
    await repo.saveLearnerAndProfile(
      { id: profile.learnerId, displayName: 'Aarav', createdAt: '2026-12-01T00:00:00Z', updatedAt: '2026-12-01T00:00:00Z' },
      profile,
    );

    const goal = makeGoal({
      id: 'g_persist',
      learnerId: profile.learnerId,
      category: 'competitive_exams',
      domainId: 'dom_competitive_exams',
      targetSkillIds: ['exam-strategy'],
    });
    await repo.saveGoal(goal);

    const path = buildPersonalizedLearningPath({
      pathId: 'p_persist',
      learnerId: profile.learnerId,
      goal,
      profile,
      learnerSkills: [],
      resources: BUNDLED_LEARNING_RESOURCES,
      startDateISO: '2026-12-01',
    });
    await repo.saveLearningPath(path);

    const sched = generateStudySchedule({
      scheduleId: 'sched_persist',
      learnerId: profile.learnerId,
      goalId: goal.id,
      path,
      startDateISO: '2026-12-01',
      targetEndDateISO: null,
      availableHoursPerDay: 2,
      studyDaysPerWeek: 5,
      studyTechnique: 'pomodoro',
      scheduleMode: 'fixed',
      includeBreaks: true,
    });

    const firstStudy = sched.sessions.find((s) => s.sessionType !== 'break')!;
    const { updatedSession, continuationSession } = transitionStudySession({
      session: firstStudy,
      nextStatus: 'partially_completed',
      actualMinutes: 15,
      notes: 'Done half',
      difficultyRating: 3,
      now: '2026-12-01T18:20:00Z',
    });

    const enriched = {
      ...sched,
      sessions: [
        ...sched.sessions.map((s) => (s.id === updatedSession.id ? updatedSession : s)),
        ...(continuationSession ? [continuationSession] : []),
      ],
    };
    await repo.saveStudySchedule(enriched);

    const revised = recalculateScheduleForMissedSessions(enriched, '2026-12-02', 5);
    await repo.saveStudySchedule(revised);
    await repo.saveSettings(createDefaultSettings('web'));

    const snap = await repo.loadSnapshot();
    expect(snap.studySchedules[0]?.studyTechnique).toBe('pomodoro');
    expect(snap.studySchedules[0]?.scheduleMode).toBe('fixed');

    const backup = await exportSnapshotToBackup(snap, 'web');
    const parsed = await validateAndParseImportBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.envelope.data.studySchedules[0]?.studyTechnique).toBe('pomodoro');
      expect(
        parsed.envelope.data.studySessions.some((s) => s.status === 'partially_completed'),
      ).toBe(true);
    }
    await repo.close();
  });
});
