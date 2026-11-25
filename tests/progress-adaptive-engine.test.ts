import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  evaluateAdaptiveRules,
  previewAdaptivePlanAdjustments,
} from '@alc/adaptive-engine';
import {
  applyActivityStatusUpdate,
  buildPersonalizedLearningPath,
  CORE_PREREQUISITES,
  CORE_SKILLS,
  createLearningGoal,
  defaultDomainRegistry,
} from '@alc/learning-engine';
import {
  computeProgressMetrics,
  computeSkillRetentionEstimate,
} from '@alc/progress-engine';
import { BUNDLED_LEARNING_RESOURCES } from '@alc/resource-management';
import {
  createDefaultSettings,
  exportSnapshotToBackup,
  validateAndParseImportBackup,
} from '@alc/storage';
import { generateStudySchedule } from '@alc/study-planner';
import type {
  AssessmentAttempt,
  GoalCategory,
  GoalPriority,
  LearnerProfile,
  LearnerSkill,
  QuizAttempt,
} from '@alc/shared-types';
import { IndexedDBLearningRepository } from '../apps/web/src/storage/indexeddb-repository';

function makeProfile(overrides: Partial<LearnerProfile> = {}): LearnerProfile {
  return {
    id: 'prof_p14',
    learnerId: 'u_p14',
    educationalBackground: 'Graduate',
    academicLevel: 'graduate',
    interests: ['Electronics', 'Physics', 'Accounting', 'Competitive Exams', 'Python', 'Design'],
    careerAspirations: 'Universal multi-domain mastery',
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
    title: `${params.category} Mastery`,
    rawDescription: `Universal study goal for ${params.category}`,
    structuredObjectives: [`Master ${params.targetSkillIds.join(', ')}`],
    targetSkillIds: params.targetSkillIds,
    priority: params.priority ?? 'medium',
    interpretedByAI: false,
  });
}

describe('Phase 14 — Progress Tracking & Adaptive Learning Engine', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('aggregates skill, topic, domain, and goal progress across 6 domains without equating study time to mastery', () => {
    const profile = makeProfile();
    const specs = [
      { category: 'gate_ece', domainId: 'dom_ece', target: 'ece-signals-systems' },
      { category: 'physics_mastery', domainId: 'dom_physics_chem', target: 'phys-mechanics' },
      { category: 'business_accounting', domainId: 'dom_accounting', target: 'acct-statements' },
      { category: 'competitive_exams', domainId: 'dom_competitive_exams', target: 'exam-strategy' },
      { category: 'python_programming', domainId: 'dom_programming', target: 'python-core' },
      { category: 'graphic_design', domainId: 'dom_design', target: 'design-layout-hierarchy' },
    ];

    const goals = specs.map((sp, i) =>
      makeGoal({
        id: `g_${sp.domainId}`,
        learnerId: profile.learnerId,
        category: sp.category,
        domainId: sp.domainId,
        targetSkillIds: [sp.target],
        priority: i === 0 ? 'high' : 'medium',
      }),
    );

    const paths = goals.map((goal) => {
      const path = buildPersonalizedLearningPath({
        pathId: `path_${goal.id}`,
        learnerId: profile.learnerId,
        goal,
        profile,
        learnerSkills: [],
        resources: BUNDLED_LEARNING_RESOURCES,
        startDateISO: '2026-11-10',
      });
      // Complete every activity in the first milestone of every goal
      const firstAct = path.stages[0]?.milestones[0]?.activities[0];
      return firstAct
        ? applyActivityStatusUpdate({ path, activityId: firstAct.id, status: 'completed', actualMinutes: 60 })
        : path;
    });

    const schedules = paths.map((path, idx) =>
      generateStudySchedule({
        scheduleId: `sched_${idx}`,
        learnerId: profile.learnerId,
        goalId: path.goalId,
        path,
        startDateISO: '2026-11-10',
        targetEndDateISO: null,
        availableHoursPerDay: 2,
        studyDaysPerWeek: 5,
      }),
    );

    // Log 40 hours (2400 min) across unassessed sessions!
    const heavyStudySessions = schedules.flatMap((sc) =>
      sc.sessions.slice(0, 2).map((s) => ({
        ...s,
        status: 'completed' as const,
        plannedMinutes: 60,
        actualMinutes: 200,
        completedAt: '2026-11-20T19:00:00Z',
      })),
    );

    // Explicitly unassessed learner skills (high self-reported confidence, zero verified competence)
    const unassessedSkills: LearnerSkill[] = specs.map((sp, idx) => ({
      id: `ls_${idx}`,
      learnerId: profile.learnerId,
      skillId: sp.target,
      selfReportedConfidence: 90,
      demonstratedCompetence: 0,
      assessmentCount: 0,
      lastAssessedAt: null,
      status: 'unassessed',
      updatedAt: '2026-11-20T00:00:00Z',
    }));

    const metrics = computeProgressMetrics({
      paths,
      sessions: heavyStudySessions,
      assessmentAttempts: [],
      quizAttempts: [],
      learnerSkills: unassessedSkills,
      progressRecords: [],
      todayISO: '2026-11-25',
      goals,
      skills: CORE_SKILLS,
      domains: defaultDomainRegistry.listDomains(),
    });

    // All 6 target domains (+ any prerequisite domains) & all 6 goals aggregated
    const aggregatedDomainIds = metrics.domainProgress.map((d) => d.domainId);
    for (const sp of specs) {
      expect(aggregatedDomainIds).toContain(sp.domainId);
    }
    expect(metrics.domainProgress.length).toBeGreaterThanOrEqual(6);
    expect(metrics.goalProgress).toHaveLength(6);
    expect(metrics.topicProgress.length).toBeGreaterThanOrEqual(6);
    expect(metrics.skillProgress.length).toBeGreaterThanOrEqual(6);

    // Activity & time tracked, yet verified mastery MUST remain null / insufficient
    expect(metrics.completedTopicsCount).toBe(6);
    expect(metrics.totalStudyHours).toBe(40);
    expect(metrics.strongSkillsCount).toBe(0);
    expect(metrics.overallDemonstratedMasteryPercent).toBeNull();
    expect(metrics.evidenceStatus).toBe('insufficient');
    expect(metrics.averageSelfReportedConfidencePercent).toBe(90);
    for (const dp of metrics.domainProgress) {
      expect(dp.demonstratedMasteryPercent).toBeNull();
      expect(dp.evidenceStatus).toBe('insufficient');
    }
  });

  it('tracks consistency, planned vs actual time accuracy, historical snapshots, and improving/declining assessment trends', () => {
    const assessments: AssessmentAttempt[] = [
      {
        id: 'att_1',
        learnerId: 'u_p14',
        assessmentId: 'diag_1',
        scorePercent: 52,
        totalQuestions: 4,
        correctCount: 2,
        averageConfidence: 4.5,
        totalTimeSeconds: 180,
        skillBreakdown: {
          'ece-network-theory': { scorePercent: 52, correct: 2, total: 4 },
        },
        startedAt: '2026-11-18T10:00:00Z',
        completedAt: '2026-11-18T10:15:00Z',
      },
      {
        id: 'att_2',
        learnerId: 'u_p14',
        assessmentId: 'diag_2',
        scorePercent: 88,
        totalQuestions: 4,
        correctCount: 4,
        averageConfidence: 4,
        totalTimeSeconds: 150,
        skillBreakdown: {
          'ece-network-theory': { scorePercent: 88, correct: 4, total: 4 },
        },
        startedAt: '2026-11-24T10:00:00Z',
        completedAt: '2026-11-24T10:15:00Z',
      },
    ];

    const quizzes: QuizAttempt[] = [
      {
        id: 'qa_1',
        learnerId: 'u_p14',
        quizId: 'q_ece',
        skillId: 'ece-network-theory',
        scorePercent: 92,
        correctCount: 5,
        totalQuestions: 5,
        answers: [],
        completedAt: '2026-11-25T09:00:00Z',
      },
    ];

    const metrics = computeProgressMetrics({
      paths: [],
      sessions: [
        {
          id: 's1',
          scheduleId: 'sc1',
          learnerId: 'u_p14',
          dateISO: '2026-11-23',
          skillId: 'ece-network-theory',
          activityId: null,
          title: 'Circuit theorems',
          sessionType: 'topic',
          plannedMinutes: 50,
          actualMinutes: 60,
          status: 'completed',
          notes: '',
          completedAt: '2026-11-23T19:00:00Z',
        },
        {
          id: 's2',
          scheduleId: 'sc1',
          learnerId: 'u_p14',
          dateISO: '2026-11-24',
          skillId: 'ece-network-theory',
          activityId: null,
          title: 'Nodal analysis',
          sessionType: 'topic',
          plannedMinutes: 50,
          actualMinutes: 50,
          status: 'completed',
          notes: '',
          completedAt: '2026-11-24T19:00:00Z',
        },
      ],
      assessmentAttempts: assessments,
      quizAttempts: quizzes,
      learnerSkills: [
        {
          id: 'ls_nt',
          learnerId: 'u_p14',
          skillId: 'ece-network-theory',
          selfReportedConfidence: 80,
          demonstratedCompetence: 88,
          assessmentCount: 2,
          lastAssessedAt: '2026-11-24T10:15:00Z',
          status: 'strong',
          updatedAt: '2026-11-24T10:15:00Z',
        },
      ],
      progressRecords: [
        {
          id: 'pr_1',
          learnerId: 'u_p14',
          dateISO: '2026-11-23',
          minutesStudied: 60,
          topicsCompleted: 1,
          quizzesCompleted: 0,
          averageQuizScore: null,
          streakDays: 1,
          recordedAt: '2026-11-23T19:00:00Z',
        },
        {
          id: 'pr_2',
          learnerId: 'u_p14',
          dateISO: '2026-11-25',
          minutesStudied: 30,
          topicsCompleted: 1,
          quizzesCompleted: 1,
          averageQuizScore: 92,
          streakDays: 3,
          recordedAt: '2026-11-25T09:05:00Z',
        },
      ],
      todayISO: '2026-11-25',
      skills: CORE_SKILLS,
      domains: defaultDomainRegistry.listDomains(),
    });

    expect(metrics.studyTimeAccuracyPercent).toBe(110); // 110 actual / 100 planned
    expect(metrics.assessmentTrend).toBe('improving');
    expect(metrics.currentStreakDays).toBe(3); // Nov 23, 24, 25 continuous!
    expect(metrics.consistencyScorePercent).toBe(40); // Nov 18, 23, 24, 25 (4/10)
    expect(metrics.historyTimeline.length).toBeGreaterThanOrEqual(3);
    expect(metrics.historyTimeline[metrics.historyTimeline.length - 1]!.cumulativeMinutesStudied).toBe(90);
  });

  it('generates evidence-backed adaptive recommendations for weak areas, overconfidence, insufficient evidence, retention intervals, and next unlocked skills', () => {
    const learnerSkills: LearnerSkill[] = [
      {
        id: 'ls_1',
        learnerId: 'u_p14',
        skillId: 'phys-math-methods',
        selfReportedConfidence: 90,
        demonstratedCompetence: 48, // overconfident & repeated low
        assessmentCount: 2,
        lastAssessedAt: '2026-11-01T10:00:00Z', // 24 days overdue!
        status: 'weak',
        updatedAt: '2026-11-01T10:00:00Z',
      },
      {
        id: 'ls_2',
        learnerId: 'u_p14',
        skillId: 'acct-basics',
        selfReportedConfidence: 60,
        demonstratedCompetence: 68, // borderline single attempt -> insufficient evidence
        assessmentCount: 1,
        lastAssessedAt: '2026-11-22T10:00:00Z',
        status: 'weak',
        updatedAt: '2026-11-22T10:00:00Z',
      },
      {
        id: 'ls_3',
        learnerId: 'u_p14',
        skillId: 'prog-fundamentals',
        selfReportedConfidence: 85,
        demonstratedCompetence: 90,
        assessmentCount: 2,
        lastAssessedAt: '2026-11-20T10:00:00Z',
        status: 'strong',
        updatedAt: '2026-11-20T10:00:00Z',
      },
    ];

    const assessments: AssessmentAttempt[] = [
      {
        id: 'att_weak',
        learnerId: 'u_p14',
        assessmentId: 'diag_w',
        scorePercent: 55,
        totalQuestions: 2,
        correctCount: 1,
        averageConfidence: 4.5,
        totalTimeSeconds: 120,
        completionStatus: 'pending_review',
        skillBreakdown: {
          'phys-math-methods': { scorePercent: 45, correct: 1, total: 2 },
        },
        startedAt: '2026-11-01T09:50:00Z',
        completedAt: '2026-11-01T10:00:00Z',
      },
    ];

    const evalOut = evaluateAdaptiveRules({
      learnerId: 'u_p14',
      todayISO: '2026-11-25',
      learnerSkills,
      assessmentAttempts: assessments,
      quizAttempts: [
        {
          id: 'qa_p',
          learnerId: 'u_p14',
          quizId: 'q1',
          skillId: 'phys-math-methods',
          scorePercent: 48,
          correctCount: 2,
          totalQuestions: 4,
          answers: [],
          completedAt: '2026-11-02T10:00:00Z',
        },
        {
          id: 'qa_py1',
          learnerId: 'u_p14',
          quizId: 'q2',
          skillId: 'prog-fundamentals',
          scorePercent: 90,
          correctCount: 9,
          totalQuestions: 10,
          answers: [],
          completedAt: '2026-11-19T10:00:00Z',
        },
        {
          id: 'qa_py2',
          learnerId: 'u_p14',
          quizId: 'q3',
          skillId: 'prog-fundamentals',
          scorePercent: 92,
          correctCount: 9,
          totalQuestions: 10,
          answers: [],
          completedAt: '2026-11-20T10:00:00Z',
        },
      ],
      studySessions: [],
      learningPaths: [],
      prerequisites: CORE_PREREQUISITES,
      skills: CORE_SKILLS,
      preferredFormat: 'reading',
      domainConfigs: { dom_physics_chem: { retentionWindowDays: 10 } },
    });

    expect(evalOut.recommendedDifficultyShift).toBe('easier');
    expect(evalOut.retentionDueSkills).toContain('phys-math-methods');
    expect(evalOut.nextEligibleSkills).toContain('python-core'); // prereq prog-fundamentals >= 65%

    const triggers = evalOut.recommendations.map((r) => r.trigger);
    expect(triggers).toContain('repeated_low_scores');
    expect(triggers).toContain('activity_format_shift');
    expect(triggers).toContain('insufficient_evidence');
    expect(triggers).toContain('retention_review_due');
    for (const rec of evalOut.recommendations) {
      expect(rec.supportingEvidence?.length).toBeGreaterThan(0);
      expect(rec.rationale.length).toBeGreaterThan(10);
    }

    // Verify retention estimate never claims biological memory measurement
    const ret = computeSkillRetentionEstimate({
      skillId: 'phys-math-methods',
      skillName: 'Mathematical Methods for Physics',
      domainId: 'dom_physics_chem',
      learnerSkill: learnerSkills[0],
      skillScores: [45, 48],
      lastRevisionDateISO: null,
      todayISO: '2026-11-25',
      config: { retentionWindowDays: 10 },
    });
    expect(ret.retentionRisk).toBe('high');
    expect(ret.needsReassessment).toBe(true);
    expect(ret.explanation.toLowerCase()).toContain('estimate derived from recorded');
  });

  it('produces non-destructive adaptive plan previews preserving completed work & user notes', () => {
    const profile = makeProfile();
    const goal = makeGoal({
      id: 'g_exam',
      learnerId: profile.learnerId,
      category: 'competitive_exams',
      domainId: 'dom_competitive_exams',
      targetSkillIds: ['exam-strategy'],
    });
    let path = buildPersonalizedLearningPath({
      pathId: 'path_exam',
      learnerId: profile.learnerId,
      goal,
      profile,
      learnerSkills: [],
      resources: BUNDLED_LEARNING_RESOURCES,
      startDateISO: '2026-11-15',
    });
    const firstAct = path.stages[0]!.milestones[0]!.activities[0]!;
    path = applyActivityStatusUpdate({ path, activityId: firstAct.id, status: 'completed', actualMinutes: 40 });

    const sched = generateStudySchedule({
      scheduleId: 'sc_exam',
      learnerId: profile.learnerId,
      goalId: goal.id,
      path,
      startDateISO: '2026-11-15',
      targetEndDateISO: null,
      availableHoursPerDay: 2,
      studyDaysPerWeek: 5,
    });
    const sessions = sched.sessions.map((s, idx) =>
      idx === 0
        ? { ...s, status: 'completed' as const, actualMinutes: 45, notes: 'Important shortcut note' }
        : s,
    );

    const preview = previewAdaptivePlanAdjustments({
      learnerId: profile.learnerId,
      todayISO: '2026-11-25',
      learnerSkills: [
        {
          id: 'ls_q',
          learnerId: profile.learnerId,
          skillId: 'exam-quant-reasoning',
          selfReportedConfidence: 60,
          demonstratedCompetence: 62,
          assessmentCount: 1,
          lastAssessedAt: '2026-11-01T10:00:00Z',
          status: 'weak',
          updatedAt: '2026-11-01T10:00:00Z',
        },
      ],
      assessmentAttempts: [],
      quizAttempts: [],
      studySessions: sessions,
      learningPaths: [path],
      schedules: [sched],
      skills: CORE_SKILLS,
    });

    expect(preview.requiresLearnerConfirmation).toBe(true);
    expect(preview.preservedCompletedActivities).toBe(1);
    expect(preview.preservedCompletedSessions).toBe(1);
    expect(preview.preservedNotesCount).toBe(1);
    expect(preview.proposedActions.length).toBeGreaterThan(0);
  });

  it('handles empty learner state & invalid negative records cleanly and persists Phase 14 records through IndexedDB backup', async () => {
    const emptyMetrics = computeProgressMetrics({
      paths: [],
      sessions: [
        {
          id: 'bad_s',
          scheduleId: 'sc',
          learnerId: 'u_empty',
          dateISO: 'invalid-date',
          skillId: 'x',
          activityId: null,
          title: 'Invalid',
          sessionType: 'topic',
          plannedMinutes: -50,
          actualMinutes: Number.NaN,
          status: 'completed',
          notes: '',
          completedAt: null,
        },
      ],
      assessmentAttempts: [],
      quizAttempts: [],
      learnerSkills: [],
      progressRecords: [],
      todayISO: '2026-11-25',
    });

    expect(emptyMetrics.overallDemonstratedMasteryPercent).toBeNull();
    expect(emptyMetrics.evidenceStatus).toBe('insufficient');
    expect(emptyMetrics.totalStudyHours).toBe(0);
    expect(emptyMetrics.assessmentTrend).toBe('insufficient_data');

    const repo = new IndexedDBLearningRepository();
    await repo.initialize();
    await repo.saveLearnerAndProfile(
      { id: 'u_p14', displayName: 'Meera', createdAt: '2026-11-25T00:00:00Z', updatedAt: '2026-11-25T00:00:00Z' },
      makeProfile(),
    );
    await repo.replaceRecommendations('u_p14', [
      {
        id: 'rec_p14_1',
        learnerId: 'u_p14',
        trigger: 'retention_review_due',
        recommendationType: 'schedule_revision',
        targetDomainId: 'dom_accounting',
        title: 'Review Double-Entry Principles',
        rationale: 'Estimated 16 days elapsed since last verification.',
        supportingEvidence: ['Last check: 2026-11-09'],
        aiExplanation: null,
        targetSkillId: 'acct-basics',
        suggestedAction: 'Complete a 15-minute recall quiz.',
        priority: 'medium',
        requiresConfirmation: true,
        status: 'accepted',
        dismissed: false,
        createdAt: '2026-11-25T00:00:00Z',
      },
    ]);
    await repo.saveSettings(createDefaultSettings('web'));
    const snap = await repo.loadSnapshot();
    const backup = await exportSnapshotToBackup(snap, 'web');
    const verified = await validateAndParseImportBackup(JSON.stringify(backup));
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.envelope.data.recommendations[0]?.trigger).toBe('retention_review_due');
      expect(verified.envelope.data.recommendations[0]?.status).toBe('accepted');
      expect(verified.envelope.data.recommendations[0]?.supportingEvidence).toEqual([
        'Last check: 2026-11-09',
      ]);
    }
    await repo.close();
  });
});
