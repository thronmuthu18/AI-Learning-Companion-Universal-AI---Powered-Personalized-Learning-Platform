import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyActivityStatusUpdate,
  buildPersonalizedLearningPath,
  computeRoadmapProgressStats,
  createLearningGoal,
  generateMultiGoalRoadmapBundle,
  previewRoadmapRegeneration,
} from '@alc/learning-engine';
import {
  generateStudySchedule,
  getDailySessions,
  getWeeklyBuckets,
  recalculateScheduleForMissedSessions,
} from '@alc/study-planner';
import { BUNDLED_LEARNING_RESOURCES } from '@alc/resource-management';
import {
  createDefaultSettings,
  exportSnapshotToBackup,
  validateAndParseImportBackup,
} from '@alc/storage';
import type { LearnerProfile, LearnerSkill } from '@alc/shared-types';
import { IndexedDBLearningRepository } from '../apps/web/src/storage/indexeddb-repository';

function makeProfile(overrides: Partial<LearnerProfile> = {}): LearnerProfile {
  return {
    id: 'prof_r12',
    learnerId: 'u_r12',
    educationalBackground: 'Undergraduate',
    academicLevel: 'undergraduate',
    interests: ['Electronics', 'Physics', 'Accounting', 'Python'],
    careerAspirations: 'Master cross-domain analytical skills',
    selfReportedSkills: [],
    targetSkills: [],
    availableHoursPerDay: 2,
    studyDaysPerWeek: 5, // 10h / week
    preferredFormat: 'mixed',
    preferredLanguage: 'English',
    targetCompletionDate: null,
    learningPreferences: {
      sessionLengthMinutes: 45,
      revisionFrequencyDays: 4,
      dailyReminderTime: '19:00',
    },
    history: [],
    updatedAt: '2026-11-25T00:00:00Z',
    ...overrides,
  };
}

describe('Phase 12 — Learning Roadmap Generator & Adaptive Schedules', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('generates domain-appropriate roadmaps with reasons and prerequisite gating across 5 unrelated domains', () => {
    const profile = makeProfile();
    const scenarios = [
      { category: 'gate_ece', domainId: 'dom_ece', target: 'ece-control-comm', forbiddenType: 'coding', expectedChain: ['ece-network-theory', 'ece-signals-systems', 'ece-control-comm'] },
      { category: 'physics_mastery', domainId: 'dom_physics_chem', target: 'phys-quantum-intro', forbiddenType: 'coding', expectedChain: ['phys-math-methods', 'phys-mechanics', 'phys-electromagnetism', 'phys-quantum-intro'] },
      { category: 'business_accounting', domainId: 'dom_accounting', target: 'acct-cost-managerial', forbiddenType: 'coding', expectedChain: ['acct-basics', 'acct-statements', 'acct-cost-managerial'] },
      { category: 'competitive_exams', domainId: 'dom_competitive_exams', target: 'exam-strategy', forbiddenType: 'coding', expectedChain: ['exam-quant-reasoning', 'exam-strategy'] },
      { category: 'python_programming', domainId: 'dom_programming', target: 'python-core', forbiddenType: null, expectedChain: ['prog-fundamentals', 'python-core'] },
    ];

    for (const sc of scenarios) {
      const goal = createLearningGoal({
        id: `g_${sc.category}`,
        learnerId: 'u_r12',
        category: sc.category,
        domainId: sc.domainId,
        title: `${sc.category} Plan`,
        rawDescription: sc.category,
        structuredObjectives: [`Complete ${sc.target}`],
        targetSkillIds: [sc.target],
        interpretedByAI: false,
      });

      const path = buildPersonalizedLearningPath({
        pathId: `p_${sc.category}`,
        learnerId: 'u_r12',
        goal,
        profile,
        learnerSkills: [],
        resources: BUNDLED_LEARNING_RESOURCES,
        startDateISO: '2026-12-01',
      });

      const allMilestones = path.stages.flatMap((s) => s.milestones);
      expect(allMilestones.map((m) => m.skillIds[0])).toEqual(sc.expectedChain);

      // Root foundation is ready, dependent milestones are blocked until foundation is verified
      expect(allMilestones[0]!.readinessState).toBe('ready');
      expect(allMilestones[allMilestones.length - 1]!.readinessState).toBe('blocked');
      expect(path.blockedSkillIds).toContain(sc.target);

      // Every milestone and activity has scheduling explanation
      for (const m of allMilestones) {
        expect(m.reason).toBeTruthy();
        for (const a of m.activities) {
          expect(a.reason).toBeTruthy();
          if (sc.forbiddenType) {
            expect(a.type).not.toBe(sc.forbiddenType);
          }
        }
      }
    }
  });

  it('coordinates multiple simultaneous goals within weekly hour caps and builds feasible vs overloaded daily/weekly plans', () => {
    const profile = makeProfile({ availableHoursPerDay: 2, studyDaysPerWeek: 5 }); // 10h/week max
    const gEce = createLearningGoal({
      id: 'g_ece_m',
      learnerId: 'u_r12',
      category: 'gate_ece',
      domainId: 'dom_ece',
      title: 'GATE ECE Priority',
      rawDescription: 'Signals & Circuits',
      structuredObjectives: ['Network Theory'],
      targetSkillIds: ['ece-signals-systems'],
      interpretedByAI: false,
      priority: 'high',
      targetCompletionDate: '2026-12-10', // deliberately too tight (9 days for >30h)
    });
    const gAcct = createLearningGoal({
      id: 'g_acct_m',
      learnerId: 'u_r12',
      category: 'business_accounting',
      domainId: 'dom_accounting',
      title: 'Business Accounting',
      rawDescription: 'Bookkeeping',
      structuredObjectives: ['Financial Statements'],
      targetSkillIds: ['acct-statements'],
      interpretedByAI: false,
      priority: 'low',
    });

    const bundle = generateMultiGoalRoadmapBundle({
      learnerId: 'u_r12',
      goals: [gAcct, gEce],
      profile,
      learnerSkills: [],
      resources: BUNDLED_LEARNING_RESOURCES,
      startDateISO: '2026-12-01',
    });

    expect(bundle.weeklyCapacityHours).toBe(10);
    expect(bundle.totalAllocatedWeeklyHours).toBeLessThanOrEqual(10);
    expect(bundle.paths).toHaveLength(2);
    const ecePath = bundle.paths.find((p) => p.goalId === 'g_ece_m')!;
    expect(ecePath.deadlineStatus?.realistic).toBe(false);
    expect(ecePath.deadlineStatus?.warning).toBeTruthy();

    // Generate daily & weekly schedules and verify missed-session rescheduling
    const sched = generateStudySchedule({
      scheduleId: 'sched_ece_m',
      learnerId: 'u_r12',
      path: ecePath,
      startDateISO: '2026-12-01',
      targetEndDateISO: gEce.targetCompletionDate ?? null,
      availableHoursPerDay: profile.availableHoursPerDay,
      studyDaysPerWeek: profile.studyDaysPerWeek,
    });
    expect(sched.isRealistic).toBe(false);
    expect(sched.feasibilityWarning).toBeTruthy();
    expect(getDailySessions(sched.sessions, '2026-12-01').length).toBeGreaterThan(0);
    expect(getWeeklyBuckets(sched.sessions).length).toBeGreaterThan(0);

    const rescheduled = recalculateScheduleForMissedSessions(
      sched,
      '2026-12-04', // treat Dec 1-3 uncompleted sessions as missed
      profile.studyDaysPerWeek,
    );
    expect(
      rescheduled.sessions.filter((s) => s.status !== 'completed' && s.dateISO < '2026-12-04'),
    ).toEqual([]);
  });

  it('preserves completed activities during adaptive regeneration, tracks effort, and persists offline in IndexedDB', async () => {
    const profile = makeProfile();
    const goal = createLearningGoal({
      id: 'g_phys_r',
      learnerId: 'u_r12',
      category: 'physics_mastery',
      domainId: 'dom_physics_chem',
      title: 'Classical Mechanics to EM',
      rawDescription: 'Physics',
      structuredObjectives: ['Vectors & Mechanics'],
      targetSkillIds: ['phys-mechanics'],
      interpretedByAI: false,
    });

    const initialPath = buildPersonalizedLearningPath({
      pathId: 'path_phys_r',
      learnerId: 'u_r12',
      goal,
      profile,
      learnerSkills: [],
      resources: BUNDLED_LEARNING_RESOURCES,
      startDateISO: '2026-12-01',
    });

    const firstAct = initialPath.stages[0]!.milestones[0]!.activities[0]!;
    const withCompletedAct = applyActivityStatusUpdate({
      path: initialPath,
      activityId: firstAct.id,
      status: 'completed',
      actualMinutes: 42,
      now: '2026-12-01T12:00:00Z',
    });

    const stats1 = computeRoadmapProgressStats(withCompletedAct);
    expect(stats1.completedActivities).toBe(1);
    expect(stats1.actualMinutes).toBe(42);

    // Learner passes foundation 'phys-math-methods' assessment -> unlocks 'phys-mechanics'!
    const newSkills: LearnerSkill[] = [
      {
        id: 'ls_pmm',
        learnerId: 'u_r12',
        skillId: 'phys-math-methods',
        selfReportedConfidence: 70,
        demonstratedCompetence: 82,
        assessmentCount: 1,
        lastAssessedAt: '2026-12-02T10:00:00Z',
        status: 'strong',
        updatedAt: '2026-12-02T10:00:00Z',
      },
    ];

    const preview = previewRoadmapRegeneration({
      currentPath: withCompletedAct,
      goal,
      profile,
      learnerSkills: newSkills,
      resources: BUNDLED_LEARNING_RESOURCES,
      startDateISO: '2026-12-02',
    });
    expect(preview.unlockedSkillIds).toContain('phys-mechanics');
    expect(preview.preservedCompletedActivities).toBeGreaterThanOrEqual(1);

    const regenPath = buildPersonalizedLearningPath({
      pathId: withCompletedAct.id,
      learnerId: 'u_r12',
      goal,
      profile,
      learnerSkills: newSkills,
      resources: BUNDLED_LEARNING_RESOURCES,
      previousPath: withCompletedAct,
      startDateISO: '2026-12-02',
    });
    const preserved = regenPath.stages[0]!.milestones[0]!.activities.find((a) => a.type === firstAct.type)!;
    expect(preserved.status).toBe('completed');
    expect(preserved.actualMinutes).toBe(42);

    // Offline IndexedDB persistence + backup parity
    const repo = new IndexedDBLearningRepository();
    await repo.initialize();
    await repo.saveLearnerAndProfile(
      { id: 'u_r12', displayName: 'Siddharth', createdAt: '2026-12-01T00:00:00Z', updatedAt: '2026-12-01T00:00:00Z' },
      profile,
    );
    await repo.saveGoal(goal);
    await repo.saveLearningPath(regenPath);
    await repo.saveSettings(createDefaultSettings('web'));
    await repo.close();

    const reopened = new IndexedDBLearningRepository();
    await reopened.initialize();
    const snap = await reopened.loadSnapshot();
    expect(snap.learningPaths[0]?.regenerationSummary?.toLowerCase()).toContain('preserved');
    expect(snap.learningPaths[0]?.stages[0]?.milestones[0]?.activities[0]?.actualMinutes).toBe(42);

    const backup = await exportSnapshotToBackup(snap, 'web');
    const verified = await validateAndParseImportBackup(JSON.stringify(backup));
    expect(verified.ok).toBe(true);
    await reopened.close();
  });

  it('handles empty, incomplete, and invalid learner profiles safely without crashing or defaulting to CS', () => {
    const goal = createLearningGoal({
      id: 'g_incomplete',
      learnerId: 'u_inc',
      category: 'business_accounting',
      domainId: 'dom_accounting',
      title: 'Accounting With Messy Profile',
      rawDescription: 'Accounting basics',
      structuredObjectives: ['Bookkeeping'],
      targetSkillIds: ['acct-basics'],
      interpretedByAI: false,
    });

    const invalidProfile = makeProfile({
      availableHoursPerDay: Number.NaN,
      studyDaysPerWeek: 99,
      preferredLanguage: '',
    });

    const clampedFromInvalid = buildPersonalizedLearningPath({
      pathId: 'p_invalid_prof',
      learnerId: 'u_inc',
      goal,
      profile: invalidProfile,
      learnerSkills: [],
      resources: [],
    });
    expect(clampedFromInvalid.weeklyHoursBudget).toBe(14); // 2h * 7d clamped cleanly
    expect(clampedFromInvalid.totalEstimatedHours).toBeGreaterThan(0);

    const fromNullProfile = buildPersonalizedLearningPath({
      pathId: 'p_null_prof',
      learnerId: 'u_inc',
      goal,
      profile: null,
      learnerSkills: [],
      resources: [],
    });
    expect(fromNullProfile.weeklyHoursBudget).toBe(10); // default 2h * 5d

    // Goal with empty targets and null profile still throws cleanly instead of inventing programming milestones
    const emptyGoal = createLearningGoal({
      id: 'g_zero',
      learnerId: 'u_inc',
      category: 'custom',
      title: 'Empty Targets',
      rawDescription: 'Empty',
      structuredObjectives: [],
      targetSkillIds: [],
      interpretedByAI: false,
    });
    expect(() =>
      buildPersonalizedLearningPath({
        pathId: 'p_zero',
        learnerId: 'u_inc',
        goal: emptyGoal,
        profile: null,
        learnerSkills: [],
        resources: [],
      }),
    ).toThrow(/at least one target skill/i);
  });
});
