import type {
  Assessment,
  AssessmentAnswer,
  AssessmentAttempt,
  AssessmentEvaluationMethod,
  AssessmentQuestion,
  DifficultyLevel,
  LearnerSkill,
  Quiz,
  QuizAttempt,
  SkillGapCategory,
} from '@alc/shared-types';

export interface SubmittedQuestionResponse {
  questionId: string;
  selectedOptionIndex?: number;
  selectedOptionIndices?: number[];
  numericAnswer?: number | null;
  unitAnswer?: string | null;
  textAnswer?: string | null;
  manualRubricScores?: Record<string, number>;
  llamaRubricEvaluation?: { scorePercent: number; rationale: string } | null;
  confidenceRating: number; // 1-5
  timeSpentSeconds: number;
}

export interface QuestionReviewItem {
  questionId: string;
  skillId: string;
  questionType: NonNullable<AssessmentQuestion['questionType']>;
  prompt: string;
  options: string[];
  selectedOptionIndex: number;
  selectedOptionIndices?: number[];
  correctOptionIndex: number;
  correctOptionIndices?: number[];
  numericAnswer?: number | null;
  unitAnswer?: string | null;
  textAnswer?: string | null;
  earnedScorePercent: number;
  evaluationMethod: AssessmentEvaluationMethod;
  pendingReview: boolean;
  isCorrect: boolean;
  isMisconception: boolean;
  needsConfidenceReinforcement: boolean;
  confidenceRating: number;
  timeSpentSeconds: number;
  explanation: string;
  incorrectFeedback: string;
}

export interface ConfidenceCompetenceDiscrepancy {
  skillId: string;
  selfConfidencePercent: number;
  demonstratedScorePercent: number;
  calibration: 'overconfident' | 'underconfident' | 'calibrated';
}

export interface AdaptiveAssessmentDecision {
  recommendedNextDifficulty: DifficultyLevel;
  revisitPrerequisiteSkills: string[];
  targetedRevisionSkills: string[];
  misconceptionSkills: string[];
  reinforcementSkills: string[];
  reasons: string[];
}

export interface AssessmentEvaluationResult {
  attempt: AssessmentAttempt;
  answers: AssessmentAnswer[];
  reviews: QuestionReviewItem[];
  discrepancies: ConfidenceCompetenceDiscrepancy[];
  updatedSkills: LearnerSkill[];
  adaptiveDecision: AdaptiveAssessmentDecision;
}

export interface AttemptComparisonEntry {
  attemptId: string;
  assessmentId: string;
  completedAt: string;
  scorePercent: number;
  scoreDeltaFromPrevious: number | null;
  averageConfidence: number;
  totalTimeSeconds: number;
  weakSkillsInAttempt: string[];
}

export interface AttemptHistorySummary {
  totalAttempts: number;
  latestScorePercent: number | null;
  bestScorePercent: number | null;
  averageScorePercent: number | null;
  scoreTrendDelta: number | null;
  repeatedWeakSkills: Array<{ skillId: string; lowAttemptCount: number; latestScorePercent: number }>;
  entries: AttemptComparisonEntry[];
}

export function classifySkillMastery(
  demonstratedCompetence: number,
  assessmentCount: number,
  isInTargetGoal = true,
): SkillGapCategory {
  if (assessmentCount === 0) {
    return isInTargetGoal ? 'unassessed' : 'missing';
  }
  if (demonstratedCompetence >= 75) return 'strong';
  if (demonstratedCompetence >= 45) return 'weak';
  return 'missing';
}

export function validateAssessmentQuestion(q: AssessmentQuestion): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!q.id.trim()) errors.push('Missing question id.');
  if (!q.skillId.trim()) errors.push('Missing target skillId.');
  if (q.prompt.trim().length < 5) errors.push(`Question "${q.id}" prompt is too short.`);

  const qType = q.questionType ?? 'mcq';
  if (qType === 'mcq' || qType === 'conceptual' || qType === 'scenario') {
    if (q.options.length < 2) errors.push(`Question "${q.id}" requires at least 2 options.`);
    if (q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
      errors.push(`Question "${q.id}" has out-of-range correctOptionIndex.`);
    }
  } else if (qType === 'multiple_select') {
    if (q.options.length < 2) errors.push(`Question "${q.id}" requires multiple options.`);
    const correctList = q.correctOptionIndices ?? [];
    if (correctList.length === 0) errors.push(`Question "${q.id}" requires correctOptionIndices.`);
  } else if (qType === 'numerical') {
    if (q.expectedNumericAnswer === undefined || !Number.isFinite(q.expectedNumericAnswer)) {
      errors.push(`Numerical question "${q.id}" requires finite expectedNumericAnswer.`);
    }
  } else if (qType === 'coding') {
    if (!q.codingTestCases || q.codingTestCases.length === 0) {
      errors.push(`Coding question "${q.id}" requires codingTestCases for safe static verification.`);
    }
  } else if (
    qType === 'descriptive' ||
    qType === 'short_answer' ||
    qType === 'case_study' ||
    qType === 'practical'
  ) {
    if ((!q.rubricCriteria || q.rubricCriteria.length === 0) && !q.referenceAnswer) {
      errors.push(`Open-response question "${q.id}" requires rubricCriteria or referenceAnswer.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function normalizeUnitToken(unit: string): string {
  const clean = unit.trim().toLowerCase().replace(/\s+/g, '');
  const aliases: Record<string, string> = {
    ohm: 'ohm',
    ohms: 'ohm',
    'ω': 'ohm',
    volt: 'v',
    volts: 'v',
    v: 'v',
    hz: 'hz',
    hertz: 'hz',
    newton: 'n',
    newtons: 'n',
    n: 'n',
    ampere: 'a',
    amperes: 'a',
    a: 'a',
    watt: 'w',
    watts: 'w',
    w: 'w',
    percent: '%',
    '%': '%',
    usd: '$',
    inr: 'inr',
    rs: 'inr',
  };
  return aliases[clean] ?? clean;
}

function evaluateSingleQuestionResponse(
  q: AssessmentQuestion,
  resp: SubmittedQuestionResponse,
): {
  earnedScorePercent: number;
  isCorrect: boolean;
  evaluationMethod: AssessmentEvaluationMethod;
  pendingReview: boolean;
  extraFeedback?: string;
} {
  const qType = q.questionType ?? 'mcq';

  if (qType === 'multiple_select') {
    const expected = new Set(
      q.correctOptionIndices && q.correctOptionIndices.length > 0
        ? q.correctOptionIndices
        : [q.correctOptionIndex],
    );
    const chosen = new Set(resp.selectedOptionIndices ?? (resp.selectedOptionIndex !== undefined && resp.selectedOptionIndex >= 0 ? [resp.selectedOptionIndex] : []));
    if (chosen.size === 0) {
      return { earnedScorePercent: 0, isCorrect: false, evaluationMethod: 'multiple_select_partial', pendingReview: false };
    }
    let truePos = 0;
    let falsePos = 0;
    for (const c of chosen) {
      if (expected.has(c)) truePos += 1;
      else falsePos += 1;
    }
    const raw = Math.max(0, Math.round(((truePos - falsePos) / expected.size) * 100));
    return {
      earnedScorePercent: raw,
      isCorrect: raw === 100 && falsePos === 0 && truePos === expected.size,
      evaluationMethod: 'multiple_select_partial',
      pendingReview: false,
    };
  }

  if (qType === 'numerical') {
    const expectedVal = q.expectedNumericAnswer;
    const submittedVal = resp.numericAnswer;
    if (expectedVal === undefined || submittedVal === null || submittedVal === undefined || !Number.isFinite(submittedVal)) {
      return {
        earnedScorePercent: 0,
        isCorrect: false,
        evaluationMethod: 'numerical_tolerance',
        pendingReview: false,
        extraFeedback: 'No valid numeric value entered.',
      };
    }
    const tol = q.numericTolerance ?? 0.01;
    const withinTol = Math.abs(submittedVal - expectedVal) <= tol;
    if (!withinTol) {
      return {
        earnedScorePercent: 0,
        isCorrect: false,
        evaluationMethod: 'numerical_tolerance',
        pendingReview: false,
        extraFeedback: `Expected ${expectedVal} ± ${tol}${q.expectedUnit ? ` ${q.expectedUnit}` : ''}.`,
      };
    }
    if (q.expectedUnit) {
      const expectedNorm = normalizeUnitToken(q.expectedUnit);
      const acceptable = new Set([
        expectedNorm,
        ...(q.acceptableUnits ?? []).map(normalizeUnitToken),
      ]);
      const submittedUnitNorm = resp.unitAnswer ? normalizeUnitToken(resp.unitAnswer) : '';
      if (!submittedUnitNorm || !acceptable.has(submittedUnitNorm)) {
        return {
          earnedScorePercent: 50,
          isCorrect: false,
          evaluationMethod: 'numerical_tolerance',
          pendingReview: false,
          extraFeedback: `Magnitude is within tolerance, but unit "${resp.unitAnswer ?? 'missing'}" does not match expected unit "${q.expectedUnit}".`,
        };
      }
    }
    return {
      earnedScorePercent: 100,
      isCorrect: true,
      evaluationMethod: 'numerical_tolerance',
      pendingReview: false,
    };
  }

  if (qType === 'coding') {
    const code = (resp.textAnswer ?? '').trim();
    const cases = q.codingTestCases ?? [];
    if (!code || cases.length === 0) {
      return {
        earnedScorePercent: 0,
        isCorrect: false,
        evaluationMethod: 'coding_static_cases',
        pendingReview: false,
        extraFeedback: 'No code solution submitted for safe static test-case verification.',
      };
    }
    // Safe non-executing static test-case matcher (never runs eval() or untrusted user code in process)
    const normalizedCode = code.replace(/\s+/g, ' ').toLowerCase();
    let passed = 0;
    for (const tc of cases) {
      const reqOk = tc.requiredPatterns.every((pat) =>
        normalizedCode.includes(pat.replace(/\s+/g, ' ').toLowerCase()),
      );
      const forbOk = (tc.forbiddenPatterns ?? []).every(
        (pat) => !normalizedCode.includes(pat.replace(/\s+/g, ' ').toLowerCase()),
      );
      if (reqOk && forbOk) passed += 1;
    }
    const pct = Math.round((passed / cases.length) * 100);
    return {
      earnedScorePercent: pct,
      isCorrect: pct >= 75,
      evaluationMethod: 'coding_static_cases',
      pendingReview: false,
    };
  }

  if (
    qType === 'descriptive' ||
    qType === 'short_answer' ||
    qType === 'case_study' ||
    qType === 'practical'
  ) {
    // Support option-based scenario/case-study questions deterministically when options are configured
    if (
      q.options.length > 0 &&
      q.correctOptionIndex >= 0 &&
      !resp.textAnswer &&
      !resp.manualRubricScores &&
      !resp.llamaRubricEvaluation
    ) {
      const isCorrect = (resp.selectedOptionIndex ?? -1) === q.correctOptionIndex;
      return {
        earnedScorePercent: isCorrect ? 100 : 0,
        isCorrect,
        evaluationMethod: 'objective_exact',
        pendingReview: false,
      };
    }

    const criteria = q.rubricCriteria ?? [];
    // 1. Manual rubric scoring takes top deterministic precedence
    if (resp.manualRubricScores && criteria.length > 0) {
      const totalMax = criteria.reduce((sum, c) => sum + c.maxPoints, 0);
      const earned = criteria.reduce(
        (sum, c) => sum + Math.max(0, Math.min(c.maxPoints, resp.manualRubricScores![c.id] ?? 0)),
        0,
      );
      const pct = totalMax > 0 ? Math.round((earned / totalMax) * 100) : 0;
      return {
        earnedScorePercent: pct,
        isCorrect: pct >= 65,
        evaluationMethod: 'rubric_manual',
        pendingReview: false,
      };
    }

    // 2. Real local Llama rubric score (only when caller explicitly ran an active local model)
    if (resp.llamaRubricEvaluation && Number.isFinite(resp.llamaRubricEvaluation.scorePercent)) {
      const pct = Math.max(0, Math.min(100, Math.round(resp.llamaRubricEvaluation.scorePercent)));
      return {
        earnedScorePercent: pct,
        isCorrect: pct >= 65,
        evaluationMethod: 'local_llama_advisory',
        pendingReview: false,
        extraFeedback: resp.llamaRubricEvaluation.rationale,
      };
    }

    // 3. Deterministic rubric keyword baseline if configured
    const text = (resp.textAnswer ?? '').trim().toLowerCase();
    const keywordCriteria = criteria.filter((c) => c.keywords && c.keywords.length > 0);
    if (keywordCriteria.length > 0 && text.length > 0) {
      const totalMax = keywordCriteria.reduce((sum, c) => sum + c.maxPoints, 0);
      let earned = 0;
      for (const crit of keywordCriteria) {
        const kws = crit.keywords ?? [];
        const matched = kws.filter((kw) => text.includes(kw.toLowerCase())).length;
        const requiredHits = Math.min(2, kws.length);
        earned += requiredHits > 0 ? (Math.min(matched, requiredHits) / requiredHits) * crit.maxPoints : 0;
      }
      const pct = totalMax > 0 ? Math.round((earned / totalMax) * 100) : 0;
      return {
        earnedScorePercent: pct,
        isCorrect: pct >= 60,
        evaluationMethod: 'rubric_keyword_baseline',
        pendingReview: false,
      };
    }

    // 4. Otherwise flag pending manual / offline Llama review cleanly (never fake a score)
    return {
      earnedScorePercent: 0,
      isCorrect: false,
      evaluationMethod: 'pending_review',
      pendingReview: true,
      extraFeedback: 'Saved for manual rubric or local Llama review.',
    };
  }

  if (qType === 'flashcard') {
    const recalled = (resp.selectedOptionIndex ?? -1) === 1;
    return {
      earnedScorePercent: recalled ? 100 : 0,
      isCorrect: recalled,
      evaluationMethod: 'flashcard_self_recall',
      pendingReview: false,
    };
  }

  // Standard MCQ, conceptual, or scenario with single correct option
  const isCorrect = (resp.selectedOptionIndex ?? -1) === q.correctOptionIndex;
  return {
    earnedScorePercent: isCorrect ? 100 : 0,
    isCorrect,
    evaluationMethod: 'objective_exact',
    pendingReview: false,
  };
}

export function buildAttemptComparisonHistory(attempts: AssessmentAttempt[]): AttemptHistorySummary {
  const sorted = [...attempts].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  if (sorted.length === 0) {
    return {
      totalAttempts: 0,
      latestScorePercent: null,
      bestScorePercent: null,
      averageScorePercent: null,
      scoreTrendDelta: null,
      repeatedWeakSkills: [],
      entries: [],
    };
  }

  const weakCountMap = new Map<string, { count: number; latestScore: number }>();
  const entries: AttemptComparisonEntry[] = sorted.map((att, idx) => {
    const prev = idx > 0 ? sorted[idx - 1]! : null;
    const weakSkillsInAttempt: string[] = [];
    for (const [skillId, br] of Object.entries(att.skillBreakdown)) {
      if (br.scorePercent < 65) {
        weakSkillsInAttempt.push(skillId);
        const curr = weakCountMap.get(skillId) ?? { count: 0, latestScore: br.scorePercent };
        weakCountMap.set(skillId, { count: curr.count + 1, latestScore: br.scorePercent });
      } else if (weakCountMap.has(skillId)) {
        const curr = weakCountMap.get(skillId)!;
        weakCountMap.set(skillId, { count: curr.count, latestScore: br.scorePercent });
      }
    }
    return {
      attemptId: att.id,
      assessmentId: att.assessmentId,
      completedAt: att.completedAt,
      scorePercent: att.scorePercent,
      scoreDeltaFromPrevious: prev ? att.scorePercent - prev.scorePercent : null,
      averageConfidence: att.averageConfidence,
      totalTimeSeconds: att.totalTimeSeconds,
      weakSkillsInAttempt,
    };
  });

  const latest = sorted[sorted.length - 1]!;
  const first = sorted[0]!;
  const bestScorePercent = Math.max(...sorted.map((a) => a.scorePercent));
  const averageScorePercent = Math.round(
    sorted.reduce((sum, a) => sum + a.scorePercent, 0) / sorted.length,
  );

  const repeatedWeakSkills = Array.from(weakCountMap.entries())
    .filter(([, v]) => v.count >= 2)
    .map(([skillId, v]) => ({
      skillId,
      lowAttemptCount: v.count,
      latestScorePercent: v.latestScore,
    }))
    .sort((a, b) => b.lowAttemptCount - a.lowAttemptCount);

  return {
    totalAttempts: sorted.length,
    latestScorePercent: latest.scorePercent,
    bestScorePercent,
    averageScorePercent,
    scoreTrendDelta: sorted.length >= 2 ? latest.scorePercent - first.scorePercent : null,
    repeatedWeakSkills,
    entries,
  };
}

export function computeAdaptiveAssessmentPlan(params: {
  attempt: AssessmentAttempt;
  discrepancies: ConfidenceCompetenceDiscrepancy[];
  existingAttempts?: AssessmentAttempt[];
  reviews?: QuestionReviewItem[];
}): AdaptiveAssessmentDecision {
  const { attempt, existingAttempts = [], reviews = [] } = params;
  const reasons: string[] = [];

  let recommendedNextDifficulty: DifficultyLevel = 'intermediate';
  if (attempt.scorePercent >= 80) {
    recommendedNextDifficulty = 'advanced';
    reasons.push(`High accuracy (${attempt.scorePercent}%) qualifies learner to step up to advanced difficulty.`);
  } else if (attempt.scorePercent < 55) {
    recommendedNextDifficulty = 'beginner';
    reasons.push(`Low accuracy (${attempt.scorePercent}%) recommends reinforcing foundational beginner concepts first.`);
  } else {
    reasons.push(`Moderate accuracy (${attempt.scorePercent}%) keeps pacing at intermediate reinforcement.`);
  }

  const revisitPrerequisiteSkills = Object.entries(attempt.skillBreakdown)
    .filter(([, b]) => b.scorePercent < 60)
    .map(([skillId]) => skillId);
  if (revisitPrerequisiteSkills.length > 0) {
    reasons.push(`Revisit prerequisite/weak skills: ${revisitPrerequisiteSkills.join(', ')}.`);
  }

  const history = buildAttemptComparisonHistory([...existingAttempts, attempt]);
  const targetedRevisionSkills = history.repeatedWeakSkills.map((r) => r.skillId);
  if (targetedRevisionSkills.length > 0) {
    reasons.push(`Repeated low performance across attempts flagged targeted revision for: ${targetedRevisionSkills.join(', ')}.`);
  }

  const misconceptionSkills = Array.from(
    new Set(reviews.filter((r) => r.isMisconception).map((r) => r.skillId)),
  );
  if (misconceptionSkills.length > 0) {
    reasons.push(`High confidence paired with wrong answers detected possible misconceptions in: ${misconceptionSkills.join(', ')}.`);
  }

  const reinforcementSkills = Array.from(
    new Set(reviews.filter((r) => r.needsConfidenceReinforcement).map((r) => r.skillId)),
  );
  if (reinforcementSkills.length > 0) {
    reasons.push(`Low confidence with correct responses suggests confidence reinforcement in: ${reinforcementSkills.join(', ')}.`);
  }

  return {
    recommendedNextDifficulty,
    revisitPrerequisiteSkills,
    targetedRevisionSkills,
    misconceptionSkills,
    reinforcementSkills,
    reasons,
  };
}

/**
 * Selects the next unanswered question dynamically based on recent accuracy and target difficulty.
 */
export function selectAdaptiveNextQuestion(params: {
  candidateQuestions: AssessmentQuestion[];
  answeredQuestionIds: string[];
  recentCorrectFlags: boolean[];
  startingDifficulty?: DifficultyLevel;
}): AssessmentQuestion | null {
  const {
    candidateQuestions,
    answeredQuestionIds,
    recentCorrectFlags,
    startingDifficulty = 'intermediate',
  } = params;

  const answeredSet = new Set(answeredQuestionIds);
  const remaining = candidateQuestions.filter((q) => !answeredSet.has(q.id));
  if (remaining.length === 0) return null;

  let targetDiff: DifficultyLevel = startingDifficulty;
  if (recentCorrectFlags.length >= 2) {
    const recentSlice = recentCorrectFlags.slice(-3);
    const acc = recentSlice.filter(Boolean).length / recentSlice.length;
    if (acc >= 0.8) targetDiff = 'advanced';
    else if (acc < 0.55) targetDiff = 'beginner';
    else targetDiff = 'intermediate';
  }

  return (
    remaining.find((q) => q.difficulty === targetDiff) ??
    remaining.find((q) => q.difficulty === 'intermediate') ??
    remaining[0]!
  );
}

/**
 * Builds a domain-scoped diagnostic or topic assessment dynamically from any question bank.
 */
export function buildDiagnosticAssessmentForSkills(params: {
  assessmentId?: string;
  title: string;
  description?: string;
  targetSkillIds: string[];
  questionBank: AssessmentQuestion[];
  kind?: Assessment['kind'];
  difficulty?: DifficultyLevel;
}): { assessment: Assessment; questions: AssessmentQuestion[] } {
  const targetSet = new Set(params.targetSkillIds);
  const matched =
    targetSet.size > 0
      ? params.questionBank.filter((q) => targetSet.has(q.skillId))
      : params.questionBank;
  const selected = matched.length > 0 ? matched : params.questionBank;

  return {
    assessment: {
      id: params.assessmentId ?? `assess_${Date.now()}`,
      title: params.title,
      description:
        params.description ?? 'Domain-matched baseline assessment measuring verified skill competence.',
      kind: params.kind ?? 'diagnostic',
      targetSkillIds: Array.from(new Set(selected.map((q) => q.skillId))),
      difficulty: params.difficulty ?? 'intermediate',
      questionIds: selected.map((q) => q.id),
      createdAt: new Date().toISOString(),
    },
    questions: selected,
  };
}

export function evaluateAssessmentSubmission(params: {
  attemptId: string;
  learnerId: string;
  assessment: Assessment;
  questions: AssessmentQuestion[];
  responses: SubmittedQuestionResponse[];
  existingSkills: LearnerSkill[];
  existingAttempts?: AssessmentAttempt[];
  startedAt: string;
  completedAt: string;
}): AssessmentEvaluationResult {
  const {
    attemptId,
    learnerId,
    assessment,
    questions,
    responses,
    existingSkills,
    existingAttempts = [],
    startedAt,
    completedAt,
  } = params;
  const qMap = new Map(questions.map((q) => [q.id, q]));
  const skillMap = new Map(existingSkills.map((s) => [s.skillId, s]));

  const answers: AssessmentAnswer[] = [];
  const reviews: QuestionReviewItem[] = [];
  const skillTotals = new Map<
    string,
    { scoreSum: number; correct: number; total: number; confSum: number }
  >();

  // Deduplicate responses by questionId (latest wins) to guard against malformed duplicate submissions
  const dedupedResponses = Array.from(
    new Map(responses.map((r) => [r.questionId, r])).values(),
  );

  let correctCount = 0;
  let scoreTotalSum = 0;
  let confSum = 0;
  let totalTimeSeconds = 0;
  const methodsUsed = new Set<AssessmentEvaluationMethod>();
  let anyPending = false;
  const misconceptionFlags: string[] = [];
  const reinforcementFlags: string[] = [];

  for (const resp of dedupedResponses) {
    const q = qMap.get(resp.questionId);
    if (!q) continue;

    const evalItem = evaluateSingleQuestionResponse(q, resp);
    if (evalItem.isCorrect) correctCount += 1;
    scoreTotalSum += evalItem.earnedScorePercent;
    methodsUsed.add(evalItem.evaluationMethod);
    if (evalItem.pendingReview) anyPending = true;

    const safeConf = Number.isFinite(resp.confidenceRating) ? resp.confidenceRating : 3;
    const safeTime = Number.isFinite(resp.timeSpentSeconds) ? resp.timeSpentSeconds : 15;
    const clampedConf = Math.max(1, Math.min(5, safeConf));
    const clampedTime = Math.max(1, Math.round(safeTime));
    confSum += clampedConf;
    totalTimeSeconds += clampedTime;

    const isMisconception = clampedConf >= 4 && !evalItem.isCorrect && !evalItem.pendingReview;
    const needsReinforcement = clampedConf <= 2 && evalItem.isCorrect;
    if (isMisconception) misconceptionFlags.push(q.skillId);
    if (needsReinforcement) reinforcementFlags.push(q.skillId);

    answers.push({
      id: `${attemptId}_${q.id}`,
      attemptId,
      questionId: q.id,
      skillId: q.skillId,
      selectedOptionIndex: resp.selectedOptionIndex ?? -1,
      selectedOptionIndices: resp.selectedOptionIndices,
      numericAnswer: resp.numericAnswer,
      unitAnswer: resp.unitAnswer,
      textAnswer: resp.textAnswer,
      earnedScorePercent: evalItem.earnedScorePercent,
      evaluationMethod: evalItem.evaluationMethod,
      pendingReview: evalItem.pendingReview,
      isCorrect: evalItem.isCorrect,
      confidenceRating: clampedConf,
      timeSpentSeconds: clampedTime,
    });

    reviews.push({
      questionId: q.id,
      skillId: q.skillId,
      questionType: q.questionType ?? 'mcq',
      prompt: q.prompt,
      options: q.options,
      selectedOptionIndex: resp.selectedOptionIndex ?? -1,
      selectedOptionIndices: resp.selectedOptionIndices,
      correctOptionIndex: q.correctOptionIndex,
      correctOptionIndices: q.correctOptionIndices,
      numericAnswer: resp.numericAnswer,
      unitAnswer: resp.unitAnswer,
      textAnswer: resp.textAnswer,
      earnedScorePercent: evalItem.earnedScorePercent,
      evaluationMethod: evalItem.evaluationMethod,
      pendingReview: evalItem.pendingReview,
      isCorrect: evalItem.isCorrect,
      isMisconception,
      needsConfidenceReinforcement: needsReinforcement,
      confidenceRating: clampedConf,
      timeSpentSeconds: clampedTime,
      explanation: q.explanation,
      incorrectFeedback: evalItem.extraFeedback
        ? `${q.incorrectFeedback} (${evalItem.extraFeedback})`
        : q.incorrectFeedback,
    });

    const prev = skillTotals.get(q.skillId) ?? { scoreSum: 0, correct: 0, total: 0, confSum: 0 };
    skillTotals.set(q.skillId, {
      scoreSum: prev.scoreSum + evalItem.earnedScorePercent,
      correct: prev.correct + (evalItem.isCorrect ? 1 : 0),
      total: prev.total + 1,
      confSum: prev.confSum + clampedConf,
    });
  }

  const totalQuestions = answers.length;
  const scorePercent = totalQuestions > 0 ? Math.round(scoreTotalSum / totalQuestions) : 0;
  const averageConfidence = totalQuestions > 0 ? Number((confSum / totalQuestions).toFixed(2)) : 0;

  const skillBreakdown: AssessmentAttempt['skillBreakdown'] = {};
  const discrepancies: ConfidenceCompetenceDiscrepancy[] = [];
  const updatedSkills: LearnerSkill[] = [];

  for (const [skillId, stats] of skillTotals.entries()) {
    const skillScore = Math.round(stats.scoreSum / stats.total);
    const avgConfPercent = Math.round(((stats.confSum / stats.total) / 5) * 100);
    skillBreakdown[skillId] = {
      correct: stats.correct,
      total: stats.total,
      scorePercent: skillScore,
    };

    const diff = avgConfPercent - skillScore;
    discrepancies.push({
      skillId,
      selfConfidencePercent: avgConfPercent,
      demonstratedScorePercent: skillScore,
      calibration: diff >= 20 ? 'overconfident' : diff <= -20 ? 'underconfident' : 'calibrated',
    });

    const existing = skillMap.get(skillId);
    const prevCount = existing?.assessmentCount ?? 0;
    const prevComp = existing?.demonstratedCompetence ?? 0;
    const nextComp =
      prevCount === 0 ? skillScore : Math.round(prevComp * 0.35 + skillScore * 0.65);
    const nextCount = prevCount + 1;

    updatedSkills.push({
      id: existing?.id ?? `ls_${learnerId}_${skillId}`,
      learnerId,
      skillId,
      selfReportedConfidence: existing?.selfReportedConfidence ?? avgConfPercent,
      demonstratedCompetence: nextComp,
      assessmentCount: nextCount,
      lastAssessedAt: completedAt,
      status: classifySkillMastery(nextComp, nextCount, true),
      updatedAt: completedAt,
    });
  }

  const evaluationMethod: AssessmentEvaluationMethod =
    methodsUsed.size === 1 ? Array.from(methodsUsed)[0]! : 'mixed';

  const baseAttempt: AssessmentAttempt = {
    id: attemptId,
    learnerId,
    assessmentId: assessment.id,
    startedAt,
    completedAt,
    scorePercent,
    totalQuestions,
    correctCount,
    averageConfidence,
    totalTimeSeconds,
    evaluationMethod,
    completionStatus: anyPending ? 'pending_review' : 'completed',
    misconceptionFlags: Array.from(new Set(misconceptionFlags)),
    reinforcementFlags: Array.from(new Set(reinforcementFlags)),
    skillBreakdown,
  };

  const adaptiveDecision = computeAdaptiveAssessmentPlan({
    attempt: baseAttempt,
    discrepancies,
    existingAttempts,
    reviews,
  });

  const attempt: AssessmentAttempt = {
    ...baseAttempt,
    adaptiveNextDifficulty: adaptiveDecision.recommendedNextDifficulty,
  };

  return {
    attempt,
    answers,
    reviews,
    discrepancies,
    updatedSkills,
    adaptiveDecision,
  };
}

export function evaluateQuizAttempt(params: {
  attemptId: string;
  learnerId: string;
  quiz: Quiz;
  selectedAnswers: Record<string, number>;
  completedAt: string;
}): QuizAttempt {
  const { attemptId, learnerId, quiz, selectedAnswers, completedAt } = params;
  let correctCount = 0;
  const answers = quiz.questions.map((q) => {
    const selectedOptionIndex = selectedAnswers[q.id] ?? -1;
    const isCorrect = selectedOptionIndex === q.correctOptionIndex;
    if (isCorrect) correctCount += 1;
    return {
      questionId: q.id,
      selectedOptionIndex,
      isCorrect,
    };
  });

  const totalQuestions = quiz.questions.length;
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return {
    id: attemptId,
    learnerId,
    quizId: quiz.id,
    skillId: quiz.skillId,
    scorePercent,
    correctCount,
    totalQuestions,
    answers,
    completedAt,
  };
}

export interface WeakTopicSummary {
  skillId: string;
  demonstratedCompetence: number;
  assessmentCount: number;
  status: SkillGapCategory;
}

export function identifyWeakTopics(
  learnerSkills: LearnerSkill[],
  thresholdPercent = 65,
): WeakTopicSummary[] {
  return learnerSkills
    .filter((ls) => ls.assessmentCount > 0 && ls.demonstratedCompetence < thresholdPercent)
    .sort((a, b) => a.demonstratedCompetence - b.demonstratedCompetence)
    .map((ls) => ({
      skillId: ls.skillId,
      demonstratedCompetence: ls.demonstratedCompetence,
      assessmentCount: ls.assessmentCount,
      status: ls.status,
    }));
}
