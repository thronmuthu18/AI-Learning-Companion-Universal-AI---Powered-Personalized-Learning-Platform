import { describe, expect, it } from 'vitest';
import {
  analyzeSkillGap,
  buildPersonalizedLearningPath,
  defaultDomainRegistry,
  DomainRegistry,
} from '@alc/learning-engine';
import { evaluateAssessmentSubmission } from '@alc/assessment-engine';
import { generateStudySchedule } from '@alc/study-planner';
import { computeProgressMetrics } from '@alc/progress-engine';
import { evaluateAdaptiveRules } from '@alc/adaptive-engine';
import { BUNDLED_LEARNING_RESOURCES, getDomainContentCoverage } from '@alc/resource-management';
import type { Assessment, AssessmentQuestion, LearnerProfile, LearningGoal } from '@alc/shared-types';

function makeProfile(learnerId: string, background: string, aspirations: string, targetSkills: string[]): LearnerProfile {
  return {
    id: `prof_${learnerId}`,
    learnerId,
    educationalBackground: background,
    academicLevel: 'undergraduate',
    interests: [background],
    careerAspirations: aspirations,
    selfReportedSkills: [],
    targetSkills,
    availableHoursPerDay: 2.5,
    studyDaysPerWeek: 6,
    preferredFormat: 'mixed',
    preferredLanguage: 'English',
    targetCompletionDate: null,
    learningPreferences: {
      sessionLengthMinutes: 50,
      revisionFrequencyDays: 4,
      dailyReminderTime: '19:00',
    },
    history: [],
    updatedAt: '2026-11-25T00:00:00Z',
  };
}

function makeGoal(learnerId: string, domainId: string, category: string, title: string, targetSkillIds: string[]): LearningGoal {
  return {
    id: `goal_${learnerId}`,
    learnerId,
    category,
    domainId,
    title,
    rawDescription: title,
    structuredObjectives: [`Master ${title}`],
    targetSkillIds,
    interpretedByAI: false,
    isActive: true,
    createdAt: '2026-11-25T00:00:00Z',
    updatedAt: '2026-11-25T00:00:00Z',
  };
}

describe('Universal All-Domain Learning Intelligence Engine', () => {
  it('handles 5 distinct domains through the exact same generic engine contracts', () => {
    const scenarios = [
      {
        name: 'GATE ECE',
        learnerId: 'u_ece',
        domainId: 'dom_ece',
        category: 'gate_ece',
        targetSkillId: 'ece-control-comm',
        expectedPrereqChain: ['ece-network-theory', 'ece-signals-systems', 'ece-control-comm'],
        expectedActivityTypes: ['numerical'],
      },
      {
        name: 'Python Programming',
        learnerId: 'u_py',
        domainId: 'dom_programming',
        category: 'python_programming',
        targetSkillId: 'python-core',
        expectedPrereqChain: ['prog-fundamentals', 'python-core'],
        expectedActivityTypes: ['coding'],
      },
      {
        name: 'Business Accounting',
        learnerId: 'u_acct',
        domainId: 'dom_accounting',
        category: 'business_accounting',
        targetSkillId: 'acct-cost-managerial',
        expectedPrereqChain: ['acct-basics', 'acct-statements', 'acct-cost-managerial'],
        expectedActivityTypes: ['case_study', 'numerical'],
      },
      {
        name: 'Physics',
        learnerId: 'u_phys',
        domainId: 'dom_physics_chem',
        category: 'physics_mastery',
        targetSkillId: 'phys-quantum-intro',
        expectedPrereqChain: ['phys-math-methods', 'phys-mechanics', 'phys-electromagnetism', 'phys-quantum-intro'],
        expectedActivityTypes: ['numerical', 'descriptive'],
      },
      {
        name: 'Competitive Examinations',
        learnerId: 'u_exam',
        domainId: 'dom_competitive_exams',
        category: 'competitive_exams',
        targetSkillId: 'exam-strategy',
        expectedPrereqChain: ['exam-quant-reasoning', 'exam-strategy'],
        expectedActivityTypes: ['mcq'],
      },
    ];

    for (const sc of scenarios) {
      const profile = makeProfile(sc.learnerId, sc.name, sc.name, [sc.targetSkillId]);
      const goal = makeGoal(sc.learnerId, sc.domainId, sc.category, sc.name, [sc.targetSkillId]);

      const gap = analyzeSkillGap({
        targetSkillIds: [sc.targetSkillId],
        learnerSkills: [],
      });
      expect(gap.hasCycle).toBe(false);
      expect(gap.topologicalOrder.map((s) => s.id)).toEqual(sc.expectedPrereqChain);
      expect(gap.recommendedNextSkills.map((s) => s.id)).toEqual([sc.expectedPrereqChain[0]]);

      const path = buildPersonalizedLearningPath({
        pathId: `path_${sc.learnerId}`,
        learnerId: sc.learnerId,
        goal,
        profile,
        learnerSkills: [],
        resources: BUNDLED_LEARNING_RESOURCES,
      });

      const milestoneSkills = path.stages.flatMap((st) => st.milestones.flatMap((m) => m.skillIds));
      expect(milestoneSkills).toEqual(sc.expectedPrereqChain);

      const activityTypes = new Set(
        path.stages.flatMap((st) => st.milestones.flatMap((m) => m.activities.map((a) => a.type))),
      );
      for (const expectedType of sc.expectedActivityTypes) {
        expect(activityTypes.has(expectedType as never)).toBe(true);
      }

      const schedule = generateStudySchedule({
        scheduleId: `sched_${sc.learnerId}`,
        learnerId: sc.learnerId,
        path,
        startDateISO: '2026-12-01',
        targetEndDateISO: null,
        availableHoursPerDay: profile.availableHoursPerDay,
        studyDaysPerWeek: profile.studyDaysPerWeek,
      });
      expect(schedule.sessions.length).toBeGreaterThan(0);

      const metrics = computeProgressMetrics({
        paths: [path],
        sessions: schedule.sessions,
        assessmentAttempts: [],
        quizAttempts: [],
        learnerSkills: [],
        progressRecords: [],
        todayISO: '2026-12-01',
      });
      expect(metrics.totalMilestonesCount).toBe(sc.expectedPrereqChain.length);

      const adaptive = evaluateAdaptiveRules({
        learnerId: sc.learnerId,
        todayISO: '2026-12-01',
        learnerSkills: [],
        assessmentAttempts: [],
        quizAttempts: [],
        studySessions: schedule.sessions,
        learningPaths: [path],
      });
      expect(adaptive.recommendedDifficultyShift).toBe('maintain');
    }
  });

  it('supports runtime registration of an unseen domain without altering core engine code', () => {
    const customRegistry = new DomainRegistry();
    customRegistry.registerDomainBundle({
      domains: [
        {
          id: 'dom_biomedical_runtime',
          name: 'Biomedical Instrumentation',
          summary: 'Biosensors, ECG/EEG amplification, and clinical signal filtering.',
          contentStatus: 'user_created',
        },
      ],
      subjects: [
        {
          id: 'sub_bio_sensors',
          domainId: 'dom_biomedical_runtime',
          name: 'Bioelectric Signals & Transducers',
          description: 'Electrode-skin impedance and biopotential amplifiers.',
          contentStatus: 'user_created',
          defaultAssessmentModes: ['practical', 'case_study'],
        },
      ],
      blueprints: [
        {
          id: 'bp_bio',
          subjectId: 'sub_bio_sensors',
          supportedQuestionTypes: ['practical', 'case_study'],
          recommendedDurationMinutes: 40,
          passingThresholdPercent: 70,
        },
      ],
      skills: [
        {
          id: 'bio-electrodes',
          slug: 'biopotential-electrodes',
          name: 'Biopotential Electrodes & Impedance',
          domain: 'Biomedical Instrumentation',
          domainId: 'dom_biomedical_runtime',
          subjectId: 'sub_bio_sensors',
          description: 'Half-cell potentials, Ag/AgCl interfaces, and noise reduction.',
          difficulty: 'beginner',
          estimatedHours: 8,
          recommendedActivityTypes: ['lesson', 'practical', 'case_study'],
          contentStatus: 'user_created',
        },
        {
          id: 'bio-ecg-amp',
          slug: 'ecg-instrumentation-amp',
          name: 'ECG Instrumentation Amplifiers',
          domain: 'Biomedical Instrumentation',
          domainId: 'dom_biomedical_runtime',
          subjectId: 'sub_bio_sensors',
          description: 'CMRR, right-leg drive circuits, and notch filtering.',
          difficulty: 'intermediate',
          estimatedHours: 12,
          recommendedActivityTypes: ['lesson', 'practical', 'case_study'],
          contentStatus: 'user_created',
        },
      ],
      prerequisites: [
        {
          id: 'bio_p1',
          skillId: 'bio-ecg-amp',
          prerequisiteSkillId: 'bio-electrodes',
          strictness: 'required',
        },
      ],
    });

    const assessment: Assessment = {
      id: 'assess_bio',
      title: 'Biomedical Baseline',
      description: 'Checks electrode fundamentals',
      goalCategory: 'biomedical',
      estimatedMinutes: 10,
      isDiagnostic: true,
    };
    const questions: AssessmentQuestion[] = [
      {
        id: 'bq_1',
        assessmentId: 'assess_bio',
        skillId: 'bio-electrodes',
        questionType: 'case_study',
        difficulty: 'beginner',
        prompt: 'Why is a driven right-leg (DRL) circuit used in ECG leads?',
        options: ['Reduce common-mode interference', 'Increase electrode DC offset', 'Remove Q-wave'],
        correctOptionIndex: 0,
        explanation: 'DRL actively cancels 50/60 Hz common-mode mains interference.',
        incorrectFeedback: 'Review common-mode rejection in biopotential front-ends.',
        estimatedSeconds: 45,
      },
    ];

    const evalRes = evaluateAssessmentSubmission({
      attemptId: 'att_bio_1',
      learnerId: 'u_bio',
      assessment,
      questions,
      responses: [{ questionId: 'bq_1', selectedOptionIndex: 0, confidenceRating: 4, timeSpentSeconds: 30 }],
      existingSkills: [],
      startedAt: '2026-11-25T10:00:00Z',
      completedAt: '2026-11-25T10:01:00Z',
    });
    expect(evalRes.attempt.scorePercent).toBe(100);

    const roadmap = buildPersonalizedLearningPath({
      pathId: 'path_bio',
      learnerId: 'u_bio',
      goal: makeGoal('u_bio', 'dom_biomedical_runtime', 'biomedical', 'Build ECG Analog Front-End', ['bio-ecg-amp']),
      profile: makeProfile('u_bio', 'Biomedical Engineering', 'Medical Devices', ['bio-ecg-amp']),
      learnerSkills: evalRes.updatedSkills,
      resources: [],
      registry: customRegistry,
    });
    expect(roadmap.stages.flatMap((s) => s.milestones.flatMap((m) => m.skillIds))).toEqual([
      'bio-electrodes',
      'bio-ecg-amp',
    ]);
    const bioElectrodesMilestone = roadmap.stages[0]!.milestones[0]!;
    expect(bioElectrodesMilestone.activities.every((a) => a.status === 'completed')).toBe(true);
    const bioEcgMilestone = roadmap.stages
      .flatMap((s) => s.milestones)
      .find((m) => m.skillIds.includes('bio-ecg-amp'))!;
    const actTypes = bioEcgMilestone.activities.map((a) => a.type);
    expect(actTypes).toContain('practical');
    expect(actTypes).toContain('case_study');
  });

  it('tracks all 30 universal domains with honest content coverage and avoids silent CS fallbacks', () => {
    const domains = defaultDomainRegistry.listDomains();
    expect(domains.length).toBeGreaterThanOrEqual(30);

    const skillDomainMap = Object.fromEntries(
      defaultDomainRegistry.getAllSkills().map((s) => [s.id, s.domainId]),
    );
    const coverage = getDomainContentCoverage(domains, BUNDLED_LEARNING_RESOURCES, skillDomainMap);

    const lawCov = coverage.find((c) => c.domainId === 'dom_law');
    expect(lawCov?.status).toBe('planned');
    expect(lawCov?.bundledCount).toBe(0);

    const eceCov = coverage.find((c) => c.domainId === 'dom_ece');
    expect(eceCov?.status).toBe('partial');

    const emptyGap = analyzeSkillGap({ targetSkillIds: [], learnerSkills: [] });
    expect(emptyGap.topologicalOrder).toEqual([]);
    expect(emptyGap.recommendedNextSkills).toEqual([]);

    expect(() =>
      buildPersonalizedLearningPath({
        pathId: 'p_empty',
        learnerId: 'u_empty',
        goal: makeGoal('u_empty', 'dom_custom', 'custom', 'Empty Goal', []),
        profile: makeProfile('u_empty', '', '', []),
        learnerSkills: [],
        resources: [],
      }),
    ).toThrow(/at least one target skill/i);
  });
});
