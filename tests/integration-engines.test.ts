import { describe, expect, it } from 'vitest';
import { evaluateAssessmentSubmission } from '../packages/assessment-engine/src/index';
import {
  CORE_DIAGNOSTIC_ASSESSMENT,
  DIAGNOSTIC_QUESTIONS,
} from '../packages/resource-management/src/index';
import {
  analyzeSkillGap,
  buildPersonalizedLearningPath,
  GOAL_TEMPLATES,
} from '../packages/learning-engine/src/index';
import {
  generateStudySchedule,
  recalculateScheduleForMissedSessions,
} from '../packages/study-planner/src/index';
import { evaluateAdaptiveRules } from '../packages/adaptive-engine/src/index';
import { computeProgressMetrics } from '../packages/progress-engine/src/index';
import {
  createDefaultSettings,
  exportSnapshotToBackup,
  validateAndParseImportBackup,
} from '../packages/storage/src/index';
import { extractAndValidateJson } from '../packages/ai-adapters/src/index';
import { AIGoalInterpretationSchema } from '../packages/validation/src/index';

describe('Assessment, Skill Gap, Roadmap, Study Planner, Adaptive & Storage Integration', () => {
  it('distinguishes self-reported confidence from demonstrated competence and builds valid roadmap + realistic schedule', async () => {
    // 1. Submit assessment with high confidence (5/5) on wrong answers for python-core and js-ts
    const responses = DIAGNOSTIC_QUESTIONS.map((q) => ({
      questionId: q.id,
      selectedOptionIndex:
        q.skillId === 'prog-fundamentals' ? q.correctOptionIndex : (q.correctOptionIndex + 1) % 4,
      confidenceRating: 5,
      timeSpentSeconds: 30,
    }));

    const evalResult = evaluateAssessmentSubmission({
      attemptId: 'att_1',
      learnerId: 'learner_1',
      assessment: CORE_DIAGNOSTIC_ASSESSMENT,
      questions: DIAGNOSTIC_QUESTIONS,
      responses,
      existingSkills: [],
      startedAt: '2026-11-25T09:00:00Z',
      completedAt: '2026-11-25T09:05:00Z',
    });

    expect(evalResult.attempt.correctCount).toBe(1);
    expect(evalResult.attempt.scorePercent).toBe(10);
    const overconfident = evalResult.discrepancies.filter((d) => d.calibration === 'overconfident');
    expect(overconfident.length).toBeGreaterThan(0);

    // 2. Skill gap analysis
    const goalTemplate = GOAL_TEMPLATES.find((g) => g.category === 'ai_engineer')!;
    const gap = analyzeSkillGap({
      targetSkillIds: goalTemplate.targetSkillIds,
      learnerSkills: evalResult.updatedSkills,
    });
    expect(gap.hasCycle).toBe(false);
    expect(gap.strongSkills.map((s) => s.id)).toContain('prog-fundamentals');
    expect(gap.missingSkills.map((s) => s.id)).toContain('python-core');

    // 3. Personalized roadmap
    const goal = {
      id: 'goal_1',
      learnerId: 'learner_1',
      category: goalTemplate.category,
      title: goalTemplate.title,
      rawDescription: goalTemplate.description,
      structuredObjectives: goalTemplate.defaultObjectives,
      targetSkillIds: goalTemplate.targetSkillIds,
      interpretedByAI: false,
      isActive: true,
      createdAt: '2026-11-25T09:06:00Z',
      updatedAt: '2026-11-25T09:06:00Z',
    };

    const path = buildPersonalizedLearningPath({
      pathId: 'path_1',
      learnerId: 'learner_1',
      goal,
      profile: null,
      learnerSkills: evalResult.updatedSkills,
      resources: [],
    });

    expect(path.stages.length).toBeGreaterThanOrEqual(2);
    expect(path.totalEstimatedHours).toBeGreaterThan(0);

    // 4. Schedule feasibility detection (unrealistic 3-day deadline for 60+ hours at 1h/day)
    const unrealisticSchedule = generateStudySchedule({
      scheduleId: 'sched_unrealistic',
      learnerId: 'learner_1',
      path,
      startDateISO: '2026-11-25',
      targetEndDateISO: '2026-11-28',
      availableHoursPerDay: 1,
      studyDaysPerWeek: 5,
    });
    expect(unrealisticSchedule.isRealistic).toBe(false);
    expect(unrealisticSchedule.feasibilityWarning).toContain('unrealistic');

    // Every study day stays within 60 minutes daily budget
    const minutesByDay = new Map<string, number>();
    for (const s of unrealisticSchedule.sessions) {
      minutesByDay.set(s.dateISO, (minutesByDay.get(s.dateISO) ?? 0) + s.plannedMinutes);
    }
    for (const mins of minutesByDay.values()) {
      expect(mins).toBeLessThanOrEqual(60);
    }

    // 5. Reschedule overdue sessions
    const rescheduled = recalculateScheduleForMissedSessions(
      unrealisticSchedule,
      '2026-12-05',
      5,
    );
    const stillOverdue = rescheduled.sessions.filter(
      (s) => s.status !== 'completed' && s.dateISO < '2026-12-05',
    );
    expect(stillOverdue.length).toBe(0);

    // 6. Adaptive rules & DB-backed progress metrics
    const adaptive = evaluateAdaptiveRules({
      learnerId: 'learner_1',
      todayISO: '2026-12-05',
      learnerSkills: evalResult.updatedSkills,
      assessmentAttempts: [evalResult.attempt],
      quizAttempts: [
        {
          id: 'qa1',
          learnerId: 'learner_1',
          quizId: 'quiz_python-core',
          skillId: 'python-core',
          scorePercent: 40,
          correctCount: 1,
          totalQuestions: 2,
          answers: [],
          completedAt: '2026-11-26T10:00:00Z',
        },
      ],
      studySessions: unrealisticSchedule.sessions,
      learningPaths: [path],
    });
    expect(adaptive.shouldRecalculateSchedule).toBe(true);
    expect(adaptive.recommendations.some((r) => r.trigger === 'repeated_low_scores')).toBe(true);

    const metrics = computeProgressMetrics({
      paths: [path],
      sessions: [],
      assessmentAttempts: [evalResult.attempt],
      quizAttempts: [],
      learnerSkills: evalResult.updatedSkills,
      progressRecords: [],
      todayISO: '2026-11-25',
    });
    expect(metrics.totalStudyHours).toBe(0); // Never fabricated
    expect(metrics.averageAssessmentScorePercent).toBe(10);

    // 7. Cross-platform JSON export + SHA-256 verification
    const backup = await exportSnapshotToBackup(
      {
        learner: { id: 'learner_1', displayName: 'Ada', createdAt: '2026-11-25T00:00:00Z', updatedAt: '2026-11-25T00:00:00Z' },
        profile: null,
        goals: [goal],
        learnerSkills: evalResult.updatedSkills,
        assessmentAttempts: [evalResult.attempt],
        assessmentAnswers: evalResult.answers,
        learningPaths: [path],
        studySchedules: [unrealisticSchedule],
        studySessions: unrealisticSchedule.sessions,
        progressRecords: [],
        recommendations: adaptive.recommendations,
        quizAttempts: [],
        userResources: [],
        modelDownloads: [],
        settings: createDefaultSettings('web'),
      },
      'web',
    );
    const serialized = JSON.stringify(backup);
    const verified = await validateAndParseImportBackup(serialized);
    expect(verified.ok).toBe(true);

    // Tampered backup fails SHA-256 integrity check
    const tampered = serialized.replace('"Ada"', '"Mallory"');
    const tamperedResult = await validateAndParseImportBackup(tampered);
    expect(tamperedResult.ok).toBe(false);
  });

  it('validates and extracts structured JSON outputs from local Llama text', () => {
    const rawLlamaOutput = `\`\`\`json
    {
      "normalizedTitle": "Applied Edge AI Engineer",
      "suggestedCategory": "ai_engineer",
      "structuredObjectives": ["Learn Python and linear algebra", "Deploy quantized Llama 3.2 locally"],
      "recommendedSkillSlugs": ["python-programming", "deep-learning-and-llms"],
      "rationale": "Focuses on Python foundations before quantized local LLM deployment."
    }
    \`\`\``;
    const result = extractAndValidateJson(rawLlamaOutput, AIGoalInterpretationSchema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.suggestedCategory).toBe('ai_engineer');
    }
  });
});
