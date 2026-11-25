import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildAttemptComparisonHistory,
  evaluateAssessmentSubmission,
  identifyWeakTopics,
  selectAdaptiveNextQuestion,
  validateAssessmentQuestion,
} from '@alc/assessment-engine';
import {
  buildGoalScopedDiagnostic,
  DIAGNOSTIC_QUESTIONS,
  MULTI_DOMAIN_DIAGNOSTIC_QUESTIONS,
} from '@alc/resource-management';
import {
  createDefaultSettings,
  exportSnapshotToBackup,
  validateAndParseImportBackup,
} from '@alc/storage';
import type { AssessmentQuestion } from '@alc/shared-types';
import { IndexedDBLearningRepository } from '../apps/web/src/storage/indexeddb-repository';

describe('Phase 10 — Universal Assessment & Diagnostic Engine', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('evaluates all 6 realistic multi-domain scenarios with heterogeneous question types', () => {
    const scenarios = [
      {
        name: 'GATE ECE',
        targetSkillIds: ['ece-network-theory', 'ece-signals-systems'],
        responses: [
          { questionId: 'udq_ece_num_1', numericAnswer: 4.02, unitAnswer: 'ohms', confidenceRating: 4, timeSpentSeconds: 45 },
          { questionId: 'udq_ece_mcq_1', selectedOptionIndex: 1, confidenceRating: 5, timeSpentSeconds: 30 },
        ],
        expectedMinScore: 100,
      },
      {
        name: 'Python Programming',
        targetSkillIds: ['python-core'],
        responses: [
          { questionId: 'udq_py_ms_1', selectedOptionIndices: [0, 2], confidenceRating: 5, timeSpentSeconds: 35 },
          {
            questionId: 'udq_py_code_1',
            textAnswer: 'def safe_mean(nums):\n  if not nums:\n    return 0\n  return sum(nums) / len(nums)',
            confidenceRating: 4,
            timeSpentSeconds: 60,
          },
          { questionId: 'dq_5', selectedOptionIndex: 1, confidenceRating: 4, timeSpentSeconds: 30 },
        ],
        expectedMinScore: 100,
      },
      {
        name: 'Business Accounting',
        targetSkillIds: ['acct-basics', 'acct-statements'],
        responses: [
          { questionId: 'udq_acct_num_1', numericAnswer: 155000, unitAnswer: 'INR', confidenceRating: 4, timeSpentSeconds: 40 },
          {
            questionId: 'udq_acct_case_1',
            textAnswer: 'Accrual net income hides working capital drain from rising accounts receivable; monitor Current Ratio, Quick Ratio, and DSO liquidity metrics.',
            confidenceRating: 4,
            timeSpentSeconds: 95,
          },
        ],
        expectedMinScore: 100,
      },
      {
        name: 'Physics',
        targetSkillIds: ['phys-mechanics', 'phys-electromagnetism'],
        responses: [
          { questionId: 'udq_phys_num_1', numericAnswer: 98.1, unitAnswer: 'N', confidenceRating: 2, timeSpentSeconds: 35 },
          {
            questionId: 'udq_phys_desc_1',
            textAnswer: 'Induced EMF equals minus the rate of change of magnetic flux; Lenz law means it opposes the flux change by conservation of energy.',
            confidenceRating: 2,
            timeSpentSeconds: 70,
          },
        ],
        expectedMinScore: 100,
      },
      {
        name: 'Competitive Examinations',
        targetSkillIds: ['exam-quant-reasoning', 'exam-strategy'],
        responses: [
          { questionId: 'udq_exam_num_1', numericAnswer: 72, unitAnswer: 'km/h', confidenceRating: 4, timeSpentSeconds: 50 },
          { questionId: 'udq_exam_fc_1', selectedOptionIndex: 1, confidenceRating: 4, timeSpentSeconds: 20 },
        ],
        expectedMinScore: 100,
      },
      {
        name: 'Graphic Design',
        targetSkillIds: ['design-typography', 'design-layout-hierarchy'],
        responses: [
          { questionId: 'udq_design_scen_1', selectedOptionIndex: 0, confidenceRating: 4, timeSpentSeconds: 30 },
          {
            questionId: 'udq_design_prac_1',
            textAnswer: 'Create one primary focal point with high contrast scale on a 12-column Swiss grid with clear alignment and generous whitespace.',
            confidenceRating: 4,
            timeSpentSeconds: 80,
          },
        ],
        expectedMinScore: 100,
      },
    ];

    for (const sc of scenarios) {
      const { assessment, questions } = buildGoalScopedDiagnostic({
        targetSkillIds: sc.targetSkillIds,
        coreQuestions: DIAGNOSTIC_QUESTIONS,
        title: `${sc.name} Diagnostic`,
      });
      expect(questions.length).toBeGreaterThanOrEqual(2);

      const res = evaluateAssessmentSubmission({
        attemptId: `att_${sc.name.replace(/\s+/g, '_')}`,
        learnerId: 'u_multi',
        assessment,
        questions,
        responses: sc.responses,
        existingSkills: [],
        startedAt: '2026-11-25T10:00:00Z',
        completedAt: '2026-11-25T10:10:00Z',
      });

      expect(res.attempt.scorePercent).toBeGreaterThanOrEqual(sc.expectedMinScore);
      expect(res.attempt.completionStatus).toBe('completed');
      expect(res.adaptiveDecision.recommendedNextDifficulty).toBe('advanced');
    }
  });

  it('validates question schemas, numerical units/tolerance, manual rubrics, and never fakes ungraded AI scores', () => {
    const invalidNum: AssessmentQuestion = {
      id: 'bad_num',
      assessmentId: 'a1',
      skillId: 'phys-mechanics',
      questionType: 'numerical',
      difficulty: 'beginner',
      prompt: 'Find force',
      options: [],
      correctOptionIndex: -1,
      explanation: 'F=ma',
      incorrectFeedback: 'Try again',
      estimatedSeconds: 30,
    };
    expect(validateAssessmentQuestion(invalidNum).valid).toBe(false);

    // Numerical within tolerance BUT wrong unit -> 50% credit & explicit unit mismatch feedback
    const unitTestQ = MULTI_DOMAIN_DIAGNOSTIC_QUESTIONS.find((q) => q.id === 'udq_phys_num_1')!;
    const unitRes = evaluateAssessmentSubmission({
      attemptId: 'att_unit',
      learnerId: 'u_unit',
      assessment: {
        id: 'a_unit',
        title: 'Unit Test',
        description: 'Unit check',
        kind: 'topic',
        targetSkillIds: ['phys-mechanics'],
        difficulty: 'intermediate',
        questionIds: [unitTestQ.id],
        createdAt: '2026-11-25T00:00:00Z',
      },
      questions: [unitTestQ],
      responses: [{ questionId: unitTestQ.id, numericAnswer: 98, unitAnswer: 'kg', confidenceRating: 5, timeSpentSeconds: 20 }],
      existingSkills: [],
      startedAt: '2026-11-25T10:00:00Z',
      completedAt: '2026-11-25T10:01:00Z',
    });
    expect(unitRes.reviews[0]?.earnedScorePercent).toBe(50);
    expect(unitRes.reviews[0]?.isCorrect).toBe(false);
    expect(unitRes.reviews[0]?.incorrectFeedback).toContain('does not match expected unit');
    // Confidence=5 + wrong triggers misconception flag!
    expect(unitRes.adaptiveDecision.misconceptionSkills).toContain('phys-mechanics');

    // Open descriptive question without keywords or Llama evaluation marks pending_review honestly
    const openQuestion: AssessmentQuestion = {
      id: 'q_open_manual',
      assessmentId: 'a_open',
      skillId: 'design-layout-hierarchy',
      questionType: 'descriptive',
      difficulty: 'intermediate',
      prompt: 'Critique typography rhythm across a multi-column magazine layout.',
      options: [],
      correctOptionIndex: -1,
      rubricCriteria: [{ id: 'r1', description: 'Depth of critique', maxPoints: 10 }],
      explanation: 'Rhythm aligns baseline grids cleanly.',
      incorrectFeedback: 'Discuss baseline alignment.',
      estimatedSeconds: 120,
    };
    const pendingRes = evaluateAssessmentSubmission({
      attemptId: 'att_pend',
      learnerId: 'u_pend',
      assessment: {
        id: 'a_open',
        title: 'Open Critique',
        description: 'Open',
        kind: 'topic',
        targetSkillIds: ['design-layout-hierarchy'],
        difficulty: 'intermediate',
        questionIds: [openQuestion.id],
        createdAt: '2026-11-25T00:00:00Z',
      },
      questions: [openQuestion],
      responses: [{ questionId: openQuestion.id, textAnswer: 'My thoughtful critique', confidenceRating: 3, timeSpentSeconds: 90 }],
      existingSkills: [],
      startedAt: '2026-11-25T10:00:00Z',
      completedAt: '2026-11-25T10:02:00Z',
    });
    expect(pendingRes.reviews[0]?.pendingReview).toBe(true);
    expect(pendingRes.attempt.completionStatus).toBe('pending_review');
    expect(pendingRes.attempt.evaluationMethod).toBe('pending_review');

    // Manual rubric grading succeeds deterministically
    const manualRes = evaluateAssessmentSubmission({
      attemptId: 'att_man',
      learnerId: 'u_pend',
      assessment: {
        id: 'a_open',
        title: 'Open Critique',
        description: 'Open',
        kind: 'topic',
        targetSkillIds: ['design-layout-hierarchy'],
        difficulty: 'intermediate',
        questionIds: [openQuestion.id],
        createdAt: '2026-11-25T00:00:00Z',
      },
      questions: [openQuestion],
      responses: [
        {
          questionId: openQuestion.id,
          textAnswer: 'My thoughtful critique',
          manualRubricScores: { r1: 8 },
          confidenceRating: 2,
          timeSpentSeconds: 90,
        },
      ],
      existingSkills: [],
      startedAt: '2026-11-25T10:00:00Z',
      completedAt: '2026-11-25T10:02:00Z',
    });
    expect(manualRes.attempt.scorePercent).toBe(80);
    expect(manualRes.attempt.evaluationMethod).toBe('rubric_manual');
    // Confidence=2 + right -> reinforcement flag
    expect(manualRes.adaptiveDecision.reinforcementSkills).toContain('design-layout-hierarchy');
  });

  it('adapts question difficulty dynamically and persists attempt comparison history offline in IndexedDB', async () => {
    const nextHard = selectAdaptiveNextQuestion({
      candidateQuestions: DIAGNOSTIC_QUESTIONS,
      answeredQuestionIds: ['dq_1', 'dq_2'],
      recentCorrectFlags: [true, true],
      startingDifficulty: 'beginner',
    });
    expect(nextHard?.difficulty).toBe('advanced');

    const nextEasy = selectAdaptiveNextQuestion({
      candidateQuestions: DIAGNOSTIC_QUESTIONS,
      answeredQuestionIds: ['dq_3', 'dq_4'],
      recentCorrectFlags: [false, false],
      startingDifficulty: 'intermediate',
    });
    expect(nextEasy?.difficulty).toBe('beginner');

    // Offline IndexedDB persistence & comparison across 2 attempts
    const repo = new IndexedDBLearningRepository();
    await repo.initialize();
    await repo.saveLearnerAndProfile(
      { id: 'u_hist', displayName: 'Riya', createdAt: '2026-11-25T08:00:00Z', updatedAt: '2026-11-25T08:00:00Z' },
      null,
    );
    await repo.saveSettings(createDefaultSettings('web'));

    const { assessment, questions } = buildGoalScopedDiagnostic({
      targetSkillIds: ['ece-network-theory', 'ece-signals-systems'],
      coreQuestions: DIAGNOSTIC_QUESTIONS,
      title: 'GATE ECE Diagnostic',
    });

    const attempt1 = evaluateAssessmentSubmission({
      attemptId: 'att_h1',
      learnerId: 'u_hist',
      assessment,
      questions,
      responses: [
        { questionId: 'udq_ece_num_1', numericAnswer: 9, unitAnswer: 'ohm', confidenceRating: 5, timeSpentSeconds: 50 },
        { questionId: 'udq_ece_mcq_1', selectedOptionIndex: 0, confidenceRating: 4, timeSpentSeconds: 40 },
      ],
      existingSkills: [],
      startedAt: '2026-11-25T09:00:00Z',
      completedAt: '2026-11-25T09:02:00Z',
    });
    expect(attempt1.attempt.scorePercent).toBe(0);
    expect(attempt1.adaptiveDecision.recommendedNextDifficulty).toBe('beginner');
    await repo.saveAssessmentSubmission(attempt1.attempt, attempt1.answers);
    await repo.upsertLearnerSkills(attempt1.updatedSkills);

    const attempt2 = evaluateAssessmentSubmission({
      attemptId: 'att_h2',
      learnerId: 'u_hist',
      assessment,
      questions,
      responses: [
        { questionId: 'udq_ece_num_1', numericAnswer: 4, unitAnswer: 'ohm', confidenceRating: 4, timeSpentSeconds: 35 },
        { questionId: 'udq_ece_mcq_1', selectedOptionIndex: 0, confidenceRating: 4, timeSpentSeconds: 30 }, // repeated mistake in ece-signals-systems
      ],
      existingSkills: attempt1.updatedSkills,
      existingAttempts: [attempt1.attempt],
      startedAt: '2026-11-25T11:00:00Z',
      completedAt: '2026-11-25T11:02:00Z',
    });
    await repo.saveAssessmentSubmission(attempt2.attempt, attempt2.answers);
    await repo.upsertLearnerSkills(attempt2.updatedSkills);

    expect(attempt2.attempt.scorePercent).toBe(50);
    expect(attempt2.adaptiveDecision.targetedRevisionSkills).toContain('ece-signals-systems');

    const snap = await repo.loadSnapshot();
    const history = buildAttemptComparisonHistory(snap.assessmentAttempts);
    expect(history.totalAttempts).toBe(2);
    expect(history.scoreTrendDelta).toBe(50);
    expect(history.repeatedWeakSkills[0]?.skillId).toBe('ece-signals-systems');

    const weakTopics = identifyWeakTopics(snap.learnerSkills);
    expect(weakTopics.some((w) => w.skillId === 'ece-signals-systems')).toBe(true);

    const backup = await exportSnapshotToBackup(snap, 'web');
    const verified = await validateAndParseImportBackup(JSON.stringify(backup));
    expect(verified.ok).toBe(true);
    await repo.close();
  });
});
