import { describe, expect, it } from 'vitest';
import type { LearnerProfile, LearningGoal } from '@alc/shared-types';
import { SkillGraph } from '../packages/skill-graph/src/index';
import {
  evaluateAssessmentSubmission,
  evaluateQuizAttempt,
  identifyWeakTopics,
} from '../packages/assessment-engine/src/index';
import {
  analyzeSkillGap,
  buildPersonalizedLearningPath,
  CORE_PREREQUISITES,
  CORE_SKILLS,
  GOAL_TEMPLATES,
} from '../packages/learning-engine/src/index';
import {
  generateStudySchedule,
  getDailySessions,
  getMonthlyTargets,
  getWeeklyBuckets,
  recalculateScheduleForMissedSessions,
} from '../packages/study-planner/src/index';
import { computeProgressMetrics } from '../packages/progress-engine/src/index';
import { evaluateAdaptiveRules } from '../packages/adaptive-engine/src/index';
import {
  BUNDLED_LEARNING_RESOURCES,
  BUNDLED_QUIZZES,
  CORE_DIAGNOSTIC_ASSESSMENT,
  DIAGNOSTIC_QUESTIONS,
} from '../packages/resource-management/src/index';

describe('Phase 07 Shared Learning Intelligence Engine (Cross-Engine E2E & Edge Cases)', () => {
  it('runs Full Stack Developer beginner scenario (2h/day, weak JS fundamentals) end-to-end across all 6 engines', () => {
    const profile: LearnerProfile = {
      id: 'prof_fs1',
      learnerId: 'u_fs1',
      educationalBackground: 'High School Graduate',
      academicLevel: 'high_school',
      interests: ['Web Apps'],
      careerAspirations: 'Full Stack Developer',
      selfReportedSkills: ['prog-fundamentals', 'js-ts'],
      targetSkills: [],
      availableHoursPerDay: 2,
      studyDaysPerWeek: 5,
      preferredFormat: 'hands_on_projects',
      preferredLanguage: 'English',
      targetCompletionDate: '2027-02-28',
      learningPreferences: { sessionLengthMinutes: 45, revisionFrequencyDays: 4, dailyReminderTime: '18:00' },
      history: [],
      updatedAt: '2026-11-25T08:00:00Z',
    };

    const fsTemplate = GOAL_TEMPLATES.find((g) => g.category === 'full_stack_developer')!;
    const goal: LearningGoal = {
      id: 'goal_fs1',
      learnerId: 'u_fs1',
      category: fsTemplate.category,
      title: fsTemplate.title,
      rawDescription: fsTemplate.description,
      structuredObjectives: fsTemplate.defaultObjectives,
      targetSkillIds: fsTemplate.targetSkillIds,
      interpretedByAI: false,
      isActive: true,
      createdAt: '2026-11-25T08:00:00Z',
      updatedAt: '2026-11-25T08:00:00Z',
    };

    // 1. Assess existing skills: prog-fundamentals=100%, js-ts=0% (weak/missing despite self-report)
    const responses = DIAGNOSTIC_QUESTIONS.map((q) => ({
      questionId: q.id,
      selectedOptionIndex:
        q.skillId === 'prog-fundamentals' || q.skillId === 'git-cli'
          ? q.correctOptionIndex
          : (q.correctOptionIndex + 1) % 4,
      confidenceRating: q.skillId === 'js-ts' ? 5 : 3,
      timeSpentSeconds: 25,
    }));

    const assessmentRes = evaluateAssessmentSubmission({
      attemptId: 'att_fs1',
      learnerId: 'u_fs1',
      assessment: CORE_DIAGNOSTIC_ASSESSMENT,
      questions: DIAGNOSTIC_QUESTIONS,
      responses,
      existingSkills: [],
      startedAt: '2026-11-25T08:05:00Z',
      completedAt: '2026-11-25T08:10:00Z',
    });

    expect(assessmentRes.discrepancies.find((d) => d.skillId === 'js-ts')?.calibration).toBe(
      'overconfident',
    );
    const weakList = identifyWeakTopics(assessmentRes.updatedSkills, 75);
    expect(weakList.some((w) => w.skillId === 'js-ts')).toBe(true);

    // 2 & 3. Identify skill gaps & resolve prerequisite ordering
    const gap = analyzeSkillGap({
      targetSkillIds: goal.targetSkillIds,
      learnerSkills: assessmentRes.updatedSkills,
    });
    expect(gap.hasCycle).toBe(false);
    expect(gap.strongSkills.map((s) => s.id)).toContain('prog-fundamentals');
    expect(gap.blockedSkills.some((b) => b.skill.id === 'react-ui')).toBe(true);
    expect(gap.blockedSkills.some((b) => b.skill.id === 'node-apis')).toBe(true);

    // 4. Generate personalised roadmap (high_school + hands_on_projects)
    const roadmap = buildPersonalizedLearningPath({
      pathId: 'path_fs1',
      learnerId: 'u_fs1',
      goal,
      profile,
      learnerSkills: assessmentRes.updatedSkills,
      resources: BUNDLED_LEARNING_RESOURCES,
    });
    expect(roadmap.stages.length).toBeGreaterThanOrEqual(2);
    const allActivities = roadmap.stages.flatMap((st) => st.milestones.flatMap((m) => m.activities));
    expect(allActivities.some((a) => a.type === 'project')).toBe(true);

    // 5. Allocate daily study time (<= 120 min/day)
    const schedule = generateStudySchedule({
      scheduleId: 'sched_fs1',
      learnerId: 'u_fs1',
      path: roadmap,
      startDateISO: '2026-11-25',
      targetEndDateISO: profile.targetCompletionDate,
      availableHoursPerDay: profile.availableHoursPerDay,
      studyDaysPerWeek: profile.studyDaysPerWeek,
    });
    const day1 = getDailySessions(schedule.sessions, '2026-11-25');
    expect(day1.reduce((acc, s) => acc + s.plannedMinutes, 0)).toBeLessThanOrEqual(120);
    expect(getWeeklyBuckets(schedule.sessions).length).toBeGreaterThan(0);
    expect(getMonthlyTargets(schedule.sessions).length).toBeGreaterThan(0);

    // 6. Track session completion & quiz attempt
    const completedSession = {
      ...day1[0]!,
      status: 'completed' as const,
      actualMinutes: day1[0]!.plannedMinutes,
      completedAt: '2026-11-25T19:00:00Z',
    };
    const jsQuiz = BUNDLED_QUIZZES.find((q) => q.skillId === 'js-ts')!;
    const lowQuiz = evaluateQuizAttempt({
      attemptId: 'qa_js_low',
      learnerId: 'u_fs1',
      quiz: jsQuiz,
      selectedAnswers: {},
      completedAt: '2026-11-26T10:00:00Z',
    });
    expect(lowQuiz.scorePercent).toBe(0);

    const progress = computeProgressMetrics({
      paths: [roadmap],
      sessions: [completedSession, ...schedule.sessions.slice(1)],
      assessmentAttempts: [assessmentRes.attempt],
      quizAttempts: [lowQuiz],
      learnerSkills: assessmentRes.updatedSkills,
      progressRecords: [],
      todayISO: '2026-11-26',
    });
    expect(progress.totalStudyHours).toBeGreaterThan(0);
    expect(progress.weakAreas.some((w) => w.skillId === 'js-ts')).toBe(true);
    expect(progress.currentStreakDays).toBeGreaterThanOrEqual(1);

    // 7. Adapt recommendations deterministically based on results
    const adaptive = evaluateAdaptiveRules({
      learnerId: 'u_fs1',
      todayISO: '2026-11-28',
      learnerSkills: assessmentRes.updatedSkills,
      assessmentAttempts: [assessmentRes.attempt],
      quizAttempts: [lowQuiz],
      studySessions: [completedSession, ...schedule.sessions.slice(1)],
      learningPaths: [roadmap],
    });
    expect(adaptive.recommendedDifficultyShift).toBe('easier');
    expect(adaptive.recommendations.some((r) => r.trigger === 'repeated_low_scores')).toBe(true);
    expect(adaptive.delayedAdvancedSkills).toContain('react-ui');
  });

  it('handles skill graph hierarchy queries, invalid/incomplete inputs, and consistent mastery difficulty bump', () => {
    const graph = new SkillGraph(CORE_SKILLS, CORE_PREREQUISITES);
    expect(graph.getSkillsByLevel('beginner').length).toBeGreaterThan(0);
    expect(graph.getPrerequisiteChain('unknown-skill')).toEqual([]);
    const chain = graph.getPrerequisiteChain('deep-learning-llm');
    expect(chain.map((s) => s.id)).toContain('python-core');
    expect(chain.map((s) => s.id)).toContain('ml-foundations');

    // Duplicate & NaN responses handled safely
    const evalDup = evaluateAssessmentSubmission({
      attemptId: 'att_dup',
      learnerId: 'u2',
      assessment: CORE_DIAGNOSTIC_ASSESSMENT,
      questions: DIAGNOSTIC_QUESTIONS.slice(0, 1),
      responses: [
        { questionId: 'dq_1', selectedOptionIndex: 0, confidenceRating: Number.NaN, timeSpentSeconds: -5 },
        { questionId: 'dq_1', selectedOptionIndex: 1, confidenceRating: 4, timeSpentSeconds: 12 },
      ],
      existingSkills: [],
      startedAt: '2026-11-25T00:00:00Z',
      completedAt: '2026-11-25T00:01:00Z',
    });
    expect(evalDup.attempt.totalQuestions).toBe(1);
    expect(evalDup.attempt.scorePercent).toBe(100);
    expect(evalDup.attempt.totalTimeSeconds).toBe(12);

    // Inverted deadline & extreme low daily hours handled gracefully
    const tpl = GOAL_TEMPLATES[0]!;
    const path = buildPersonalizedLearningPath({
      pathId: 'p_edge',
      learnerId: 'u2',
      goal: {
        id: 'g_edge',
        learnerId: 'u2',
        category: tpl.category,
        title: tpl.title,
        rawDescription: tpl.description,
        structuredObjectives: tpl.defaultObjectives,
        targetSkillIds: ['prog-fundamentals'],
        interpretedByAI: false,
        isActive: true,
        createdAt: '2026-11-25T00:00:00Z',
        updatedAt: '2026-11-25T00:00:00Z',
      },
      profile: null,
      learnerSkills: [],
      resources: [],
    });
    const badSched = generateStudySchedule({
      scheduleId: 's_edge',
      learnerId: 'u2',
      path,
      startDateISO: '2026-12-10',
      targetEndDateISO: '2026-12-01',
      availableHoursPerDay: 0,
      studyDaysPerWeek: 0,
    });
    expect(badSched.isRealistic).toBe(false);
    expect(badSched.dailyAvailableMinutes).toBeGreaterThanOrEqual(15);

    const replanned = recalculateScheduleForMissedSessions(badSched, '2026-12-20', 5);
    expect(replanned.sessions.every((s) => s.dateISO >= '2026-12-20')).toBe(true);

    // Consistent mastery (>=85% twice) triggers difficulty increase
    const adaptiveMastery = evaluateAdaptiveRules({
      learnerId: 'u2',
      todayISO: '2026-11-25',
      learnerSkills: [],
      assessmentAttempts: [],
      quizAttempts: [
        { id: 'q1', learnerId: 'u2', quizId: 'qz', skillId: 'python-core', scorePercent: 90, correctCount: 9, totalQuestions: 10, answers: [], completedAt: '2026-11-24T00:00:00Z' },
        { id: 'q2', learnerId: 'u2', quizId: 'qz', skillId: 'python-core', scorePercent: 95, correctCount: 19, totalQuestions: 20, answers: [], completedAt: '2026-11-25T00:00:00Z' },
      ],
      studySessions: [],
      learningPaths: [],
    });
    expect(adaptiveMastery.recommendedDifficultyShift).toBe('harder');
  });
});
