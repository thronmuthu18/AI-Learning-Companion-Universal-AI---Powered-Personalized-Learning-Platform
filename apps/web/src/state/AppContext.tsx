import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ApplicationSettings,
  AppScreenId,
  Assessment,
  AssessmentAttempt,
  AssessmentQuestion,
  BackupEnvelope,
  CompletionStatus,
  DifficultyLevel,
  GoalCategory,
  GoalHorizon,
  GoalKind,
  GoalLifecycleStatus,
  GoalPriority,
  Learner,
  LearnerProfile,
  LearnerSkill,
  LearningGoal,
  LearningPath,
  LearningResource,
  QuizAttempt,
  Recommendation,
  StudySchedule,
  StudyScheduleMode,
  StudySession,
  StudyTechnique,
} from '@alc/shared-types';
import type { AICapabilities, ModelStatusSnapshot } from '@alc/ai-contracts';
import { LocalAIAdvisoryService } from '@alc/ai-adapters';
import {
  buildAttemptComparisonHistory,
  evaluateAssessmentSubmission,
  evaluateQuizAttempt,
  type AssessmentEvaluationResult,
  type AttemptHistorySummary,
  type SubmittedQuestionResponse,
} from '@alc/assessment-engine';
import {
  evaluateAdaptiveRules,
  previewAdaptivePlanAdjustments,
  type AdaptivePlanAdjustmentPreview,
} from '@alc/adaptive-engine';
import {
  analyzeSkillGap,
  applyActivityStatusUpdate,
  buildLearnerAndProfileUpdate,
  buildPersonalizedLearningPath,
  computeRoadmapProgressStats,
  CORE_PREREQUISITES,
  CORE_SKILLS,
  createLearningGoal,
  defaultDomainRegistry,
  GOAL_TEMPLATES,
  previewRoadmapRegeneration,
  prioritizeAndAllocateGoals,
  setGoalPriority,
  transitionGoalStatus,
  updateLearningGoal,
  type LearnerProfileDraft,
  type MultiGoalPrioritizationReport,
  type RoadmapProgressStats,
  type RoadmapRegenerationPreview,
  type SkillGapReport,
} from '@alc/learning-engine';
import { computeProgressMetrics, type ProgressDashboardMetrics } from '@alc/progress-engine';
import {
  buildGoalScopedDiagnostic,
  BUNDLED_LEARNING_RESOURCES,
  BUNDLED_QUIZZES,
  DIAGNOSTIC_QUESTIONS,
  filterValidResources,
} from '@alc/resource-management';
import {
  createDefaultSettings,
  exportSnapshotToBackup,
  type LearningDatabaseSnapshot,
  validateAndParseImportBackup,
} from '@alc/storage';
import {
  generateStudySchedule,
  previewScheduleRevision,
  recalculateScheduleForMissedSessions,
  transitionStudySession,
  type ScheduleRevisionPreview,
} from '@alc/study-planner';
import { IndexedDBLearningRepository } from '../storage/indexeddb-repository';
import {
  WEB_DEFAULT_MODEL_F16,
  WebWebLLMProvider,
} from '../ai/web-webllm-provider';

interface AppContextValue {
  ready: boolean;
  screen: AppScreenId;
  navigate: (screen: AppScreenId) => void;
  isOnline: boolean;
  snapshot: LearningDatabaseSnapshot;
  activeGoal: LearningGoal | null;
  focusedGoalId: string | null;
  setFocusedGoalId: (goalId: string | null) => void;
  goalPrioritization: MultiGoalPrioritizationReport;
  activePath: LearningPath | null;
  roadmapProgressStats: RoadmapProgressStats | null;
  activeSchedule: StudySchedule | null;
  skillGap: SkillGapReport;
  metrics: ProgressDashboardMetrics;
  allResources: LearningResource[];
  selectedResourceId: string | null;
  setSelectedResourceId: (id: string | null) => void;
  selectedQuizId: string | null;
  setSelectedQuizId: (id: string | null) => void;
  lastAssessmentResult: AssessmentEvaluationResult | null;
  activeDiagnosticAssessment: Assessment;
  activeDiagnosticQuestions: AssessmentQuestion[];
  assessmentHistorySummary: AttemptHistorySummary;
  lastQuizAttempt: QuizAttempt | null;
  aiCapabilities: AICapabilities | null;
  aiStatus: ModelStatusSnapshot;
  advisoryService: LocalAIAdvisoryService;
  provider: WebWebLLMProvider;
  initializeLocalModel: (modelId?: string) => Promise<void>;
  unloadLocalModel: () => Promise<void>;
  deleteLocalModelCache: (modelId?: string) => Promise<void>;
  saveProfile: (input: LearnerProfileDraft) => Promise<void>;
  selectOrCreateGoal: (params: {
    category: GoalCategory;
    domainId?: string;
    subjectId?: string;
    title: string;
    rawDescription: string;
    structuredObjectives: string[];
    targetSkillIds: string[];
    interpretedByAI: boolean;
    interpretationMode?: LearningGoal['interpretationMode'];
    priority?: GoalPriority;
    horizon?: GoalHorizon;
    goalKind?: GoalKind;
    targetCompletionDate?: string | null;
    expectedProficiency?: DifficultyLevel;
    learningPurpose?: string;
    keepExistingActive?: boolean;
  }) => Promise<void>;
  updateGoalDetails: (
    goalId: string,
    patch: Partial<Pick<LearningGoal, 'title' | 'rawDescription' | 'targetCompletionDate' | 'priority' | 'horizon' | 'goalKind' | 'targetSkillIds'>>,
    note?: string,
  ) => Promise<void>;
  changeGoalStatus: (goalId: string, status: GoalLifecycleStatus, note?: string) => Promise<void>;
  changeGoalPriority: (goalId: string, priority: GoalPriority) => Promise<void>;
  deleteGoalSafely: (goalId: string) => Promise<void>;
  submitDiagnosticAssessment: (
    responses: SubmittedQuestionResponse[],
    startedAt: string,
    customAssessment?: Assessment,
    customQuestions?: AssessmentQuestion[],
  ) => Promise<AssessmentEvaluationResult>;
  submitQuiz: (quizId: string, selectedAnswers: Record<string, number>) => Promise<QuizAttempt>;
  regenerateRoadmapAndSchedule: () => Promise<void>;
  previewRoadmapChanges: () => RoadmapRegenerationPreview | null;
  toggleRoadmapActivity: (
    pathId: string,
    activityId: string,
    status: CompletionStatus,
    actualMinutes?: number,
  ) => Promise<void>;
  completeStudySession: (session: StudySession, actualMinutes?: number) => Promise<void>;
  updateStudySessionLifecycle: (
    session: StudySession,
    nextStatus: CompletionStatus,
    options?: {
      actualMinutes?: number;
      notes?: string;
      difficultyRating?: number | null;
    },
  ) => Promise<void>;
  recalculateMissedSchedule: (options?: {
    dailyBudgetOverrideMinutes?: number;
    unavailableDatesISO?: string[];
    preferredStartTimeHHMM?: string;
    preferredStudyDays?: number[];
  }) => Promise<void>;
  previewMissedAndPostponedReschedule: (options?: {
    dailyBudgetOverrideMinutes?: number;
    unavailableDatesISO?: string[];
    preferredStartTimeHHMM?: string;
    preferredStudyDays?: number[];
  }) => { preview: ScheduleRevisionPreview; revisedSchedule: StudySchedule } | null;
  applyScheduleOptions: (options: {
    studyTechnique?: StudyTechnique;
    scheduleMode?: StudyScheduleMode;
    includeBreaks?: boolean;
    preferredStartTimeHHMM?: string;
    unavailableDatesISO?: string[];
    preferredStudyDays?: number[];
    availableHoursOverride?: number;
  }) => Promise<void>;
  addUserResource: (res: Omit<LearningResource, 'id' | 'updatedAt' | 'origin' | 'isDownloadedOffline'>) => Promise<void>;
  toggleOfflineDownloadResource: (resourceId: string) => Promise<void>;
  adaptivePlanPreview: AdaptivePlanAdjustmentPreview | null;
  refreshAdaptiveRecommendations: () => Promise<Recommendation[]>;
  respondToRecommendation: (recId: string, decision: 'accepted' | 'dismissed') => Promise<void>;
  confirmAndApplyAdaptiveAdjustments: () => Promise<void>;
  updateSettings: (partial: Partial<ApplicationSettings>) => Promise<void>;
  exportBackupJson: () => Promise<string>;
  importBackupJson: (rawJson: string) => Promise<{ ok: boolean; message: string }>;
  resetAllLocalData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repoRef = useRef(new IndexedDBLearningRepository());
  const providerRef = useRef(new WebWebLLMProvider());
  const advisoryRef = useRef(new LocalAIAdvisoryService(providerRef.current));

  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<AppScreenId>('splash');
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [snapshot, setSnapshot] = useState<LearningDatabaseSnapshot>({
    learner: null,
    profile: null,
    goals: [],
    learnerSkills: [],
    assessmentAttempts: [],
    assessmentAnswers: [],
    learningPaths: [],
    studySchedules: [],
    studySessions: [],
    progressRecords: [],
    recommendations: [],
    quizAttempts: [],
    userResources: [],
    modelDownloads: [],
    settings: createDefaultSettings('web'),
  });
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    BUNDLED_LEARNING_RESOURCES[0]?.id ?? null,
  );
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(
    BUNDLED_QUIZZES[0]?.id ?? null,
  );
  const [lastAssessmentResult, setLastAssessmentResult] =
    useState<AssessmentEvaluationResult | null>(null);
  const [lastQuizAttempt, setLastQuizAttempt] = useState<QuizAttempt | null>(null);
  const [aiCapabilities, setAiCapabilities] = useState<AICapabilities | null>(null);
  const [aiStatus, setAiStatus] = useState<ModelStatusSnapshot>(
    providerRef.current.getModelStatus(),
  );

  const reloadSnapshot = useCallback(async () => {
    const next = await repoRef.current.loadSnapshot();
    setSnapshot(next);
    return next;
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    (async () => {
      await repoRef.current.initialize();
      const loaded = await reloadSnapshot();
      const caps = await providerRef.current.getCapabilities();
      setAiCapabilities(caps);

      const cached = await providerRef.current.isModelCached(loaded.settings.activeModelId);
      if (cached) {
        setAiStatus({
          modelId: loaded.settings.activeModelId,
          state: 'installed',
          progressPercent: 100,
          statusMessage: 'Model weights cached locally in browser. Click Initialize to load into WebGPU.',
          errorMessage: null,
          loadTimeMs: null,
          offlineReady: true,
          lastStats: null,
        });
      }
      setReady(true);
      // Transition cleanly from splash to welcome or dashboard
      setTimeout(() => {
        setScreen((prev) =>
          prev === 'splash' ? (loaded.learner ? 'dashboard' : 'welcome') : prev,
        );
      }, 650);
    })();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [reloadSnapshot]);

  const [focusedGoalId, setFocusedGoalId] = useState<string | null>(null);

  const activeGoal = useMemo(() => {
    const activeGoals = snapshot.goals.filter((g) => (g.status ? g.status === 'active' : g.isActive));
    if (focusedGoalId) {
      const focused = snapshot.goals.find((g) => g.id === focusedGoalId);
      if (focused) return focused;
    }
    return activeGoals[0] ?? snapshot.goals[0] ?? null;
  }, [snapshot.goals, focusedGoalId]);

  const activePath = useMemo(() => {
    if (activeGoal) {
      return (
        snapshot.learningPaths.find((p) => p.goalId === activeGoal.id) ??
        snapshot.learningPaths[0] ??
        null
      );
    }
    return snapshot.learningPaths[0] ?? null;
  }, [snapshot.learningPaths, activeGoal]);

  const roadmapProgressStats = useMemo(
    () => (activePath ? computeRoadmapProgressStats(activePath) : null),
    [activePath],
  );

  const activeSchedule = useMemo(() => {
    const sched =
      (activePath ? snapshot.studySchedules.find((s) => s.pathId === activePath.id) : null) ??
      snapshot.studySchedules[0] ??
      null;
    if (!sched) return null;
    const matchedSessions = snapshot.studySessions.filter((s) => s.scheduleId === sched.id);
    return {
      ...sched,
      sessions: matchedSessions.length > 0 ? matchedSessions : sched.sessions,
    };
  }, [snapshot.studySchedules, snapshot.studySessions, activePath]);

  const allResources = useMemo(
    () => filterValidResources([...BUNDLED_LEARNING_RESOURCES, ...snapshot.userResources]),
    [snapshot.userResources],
  );

  const skillGap = useMemo(() => {
    const targetIds =
      activeGoal?.targetSkillIds ??
      (snapshot.profile?.targetSkills.length ? snapshot.profile.targetSkills : []);
    const targetProficiencyPercent =
      activeGoal?.expectedProficiency === 'advanced'
        ? 80
        : activeGoal?.expectedProficiency === 'beginner'
          ? 65
          : 75;
    return analyzeSkillGap({
      targetSkillIds: targetIds,
      learnerSkills: snapshot.learnerSkills,
      targetProficiencyPercent,
    });
  }, [activeGoal, snapshot.profile, snapshot.learnerSkills]);

  const todayISO = new Date().toISOString().slice(0, 10);

  const { assessment: activeDiagnosticAssessment, questions: activeDiagnosticQuestions } = useMemo(
    () =>
      buildGoalScopedDiagnostic({
        targetSkillIds: activeGoal?.targetSkillIds ?? snapshot.profile?.targetSkills ?? [],
        coreQuestions: DIAGNOSTIC_QUESTIONS,
        title: activeGoal ? `${activeGoal.title} — Diagnostic` : undefined,
      }),
    [activeGoal, snapshot.profile],
  );

  const assessmentHistorySummary = useMemo(
    () => buildAttemptComparisonHistory(snapshot.assessmentAttempts),
    [snapshot.assessmentAttempts],
  );

  const goalPrioritization = useMemo(
    () =>
      prioritizeAndAllocateGoals({
        goals: snapshot.goals,
        profile: snapshot.profile,
        learnerSkills: snapshot.learnerSkills,
        existingSchedules: snapshot.studySchedules,
        todayISO,
      }),
    [snapshot.goals, snapshot.profile, snapshot.learnerSkills, snapshot.studySchedules, todayISO],
  );

  const metrics = useMemo(
    () =>
      computeProgressMetrics({
        paths: snapshot.learningPaths,
        sessions: snapshot.studySessions,
        assessmentAttempts: snapshot.assessmentAttempts,
        quizAttempts: snapshot.quizAttempts,
        learnerSkills: snapshot.learnerSkills,
        progressRecords: snapshot.progressRecords,
        todayISO,
        goals: snapshot.goals,
        skills: CORE_SKILLS,
        domains: defaultDomainRegistry.listDomains(),
      }),
    [snapshot, todayISO],
  );

  const adaptivePlanPreview = useMemo(() => {
    const learnerId = snapshot.learner?.id;
    if (!learnerId) return null;
    return previewAdaptivePlanAdjustments({
      learnerId,
      todayISO,
      learnerSkills: snapshot.learnerSkills,
      assessmentAttempts: snapshot.assessmentAttempts,
      quizAttempts: snapshot.quizAttempts,
      studySessions: snapshot.studySessions,
      learningPaths: snapshot.learningPaths,
      schedules: snapshot.studySchedules,
      skills: CORE_SKILLS,
    });
  }, [snapshot, todayISO]);

  const initializeLocalModel = useCallback(
    async (modelId?: string) => {
      const targetModel = modelId ?? snapshot.settings.activeModelId ?? WEB_DEFAULT_MODEL_F16;
      if (snapshot.settings.offlineOnlyMode) {
        const cached = await providerRef.current.isModelCached(targetModel);
        if (!cached) {
          throw new Error(
            'Strict Offline Mode is active and model weights are not cached yet. Disable Offline-Only temporarily to cache weights once.',
          );
        }
      }
      await providerRef.current.loadModel({ modelId: targetModel }, () => {
        setAiStatus(providerRef.current.getModelStatus());
      });
      setAiStatus(providerRef.current.getModelStatus());
      await repoRef.current.saveModelDownload({
        id: `md_${targetModel}`,
        modelId: targetModel,
        platform: 'web',
        state: 'ready',
        progressPercent: 100,
        bytesDownloaded: 879 * 1024 * 1024,
        totalBytes: 879 * 1024 * 1024,
        localModelPath: `indexeddb://webllm/${targetModel}`,
        localTokenizerPath: `indexeddb://webllm/${targetModel}/tokenizer.json`,
        verifiedSha256: 'webllm-sri-verified',
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      });
      await reloadSnapshot();
    },
    [snapshot.settings, reloadSnapshot],
  );

  const unloadLocalModel = useCallback(async () => {
    await providerRef.current.unloadModel();
    setAiStatus(providerRef.current.getModelStatus());
  }, []);

  const deleteLocalModelCache = useCallback(
    async (modelId?: string) => {
      await providerRef.current.deleteCachedModel(modelId ?? snapshot.settings.activeModelId);
      setAiStatus(providerRef.current.getModelStatus());
    },
    [snapshot.settings.activeModelId],
  );

  const saveProfile: AppContextValue['saveProfile'] = useCallback(
    async (input) => {
      const { learner, profile, newlySeededSkills } = buildLearnerAndProfileUpdate({
        existingLearner: snapshot.learner,
        existingProfile: snapshot.profile,
        existingLearnerSkills: snapshot.learnerSkills,
        input,
        defaultLearnerId: 'learner_local_1',
        defaultProfileId: 'profile_local_1',
      });

      await repoRef.current.saveLearnerAndProfile(learner, profile);
      if (newlySeededSkills.length > 0) {
        await repoRef.current.upsertLearnerSkills(newlySeededSkills);
      }

      await reloadSnapshot();
    },
    [snapshot.learner, snapshot.profile, snapshot.learnerSkills, reloadSnapshot],
  );

  const selectOrCreateGoal: AppContextValue['selectOrCreateGoal'] = useCallback(
    async (params) => {
      const learnerId = snapshot.learner?.id ?? 'learner_local_1';
      const now = new Date().toISOString();
      if (params.keepExistingActive === false) {
        for (const existing of snapshot.goals) {
          if (existing.isActive) {
            await repoRef.current.saveGoal(
              transitionGoalStatus(existing, 'paused', 'Paused while switching primary focus', now),
            );
          }
        }
      }
      const goal = createLearningGoal({
        learnerId,
        category: params.category,
        domainId: params.domainId,
        subjectId: params.subjectId,
        title: params.title,
        rawDescription: params.rawDescription,
        structuredObjectives: params.structuredObjectives,
        targetSkillIds: params.targetSkillIds,
        interpretedByAI: params.interpretedByAI,
        interpretationMode: params.interpretationMode,
        priority: params.priority,
        horizon: params.horizon,
        goalKind: params.goalKind,
        targetCompletionDate: params.targetCompletionDate ?? snapshot.profile?.targetCompletionDate ?? null,
        expectedProficiency: params.expectedProficiency,
        learningPurpose: params.learningPurpose,
        profile: snapshot.profile,
        learnerSkills: snapshot.learnerSkills,
        now,
      });
      await repoRef.current.saveGoal(goal);
      setFocusedGoalId(goal.id);

      const path = buildPersonalizedLearningPath({
        pathId: `path_${goal.id}`,
        learnerId,
        goal,
        profile: snapshot.profile,
        learnerSkills: snapshot.learnerSkills,
        resources: allResources,
      });
      await repoRef.current.saveLearningPath(path);

      const schedule = generateStudySchedule({
        scheduleId: `sched_${goal.id}`,
        learnerId,
        path,
        startDateISO: todayISO,
        targetEndDateISO: goal.targetCompletionDate ?? snapshot.profile?.targetCompletionDate ?? null,
        availableHoursPerDay: snapshot.profile?.availableHoursPerDay ?? 2,
        studyDaysPerWeek: snapshot.profile?.studyDaysPerWeek ?? 5,
        sessionLengthMinutes: snapshot.profile?.learningPreferences.sessionLengthMinutes ?? 45,
      });
      await repoRef.current.saveStudySchedule(schedule);

      await reloadSnapshot();
    },
    [snapshot.learner, snapshot.goals, snapshot.profile, snapshot.learnerSkills, allResources, todayISO, reloadSnapshot],
  );

  const updateGoalDetails: AppContextValue['updateGoalDetails'] = useCallback(
    async (goalId, patch, note) => {
      const found = snapshot.goals.find((g) => g.id === goalId);
      if (!found) return;
      const updated = updateLearningGoal(found, patch, note);
      await repoRef.current.saveGoal(updated);
      await reloadSnapshot();
    },
    [snapshot.goals, reloadSnapshot],
  );

  const changeGoalStatus: AppContextValue['changeGoalStatus'] = useCallback(
    async (goalId, status, note) => {
      const found = snapshot.goals.find((g) => g.id === goalId);
      if (!found) return;
      const updated = transitionGoalStatus(found, status, note);
      await repoRef.current.saveGoal(updated);
      await reloadSnapshot();
    },
    [snapshot.goals, reloadSnapshot],
  );

  const changeGoalPriority: AppContextValue['changeGoalPriority'] = useCallback(
    async (goalId, priority) => {
      const found = snapshot.goals.find((g) => g.id === goalId);
      if (!found) return;
      const updated = setGoalPriority(found, priority);
      await repoRef.current.saveGoal(updated);
      await reloadSnapshot();
    },
    [snapshot.goals, reloadSnapshot],
  );

  const deleteGoalSafely: AppContextValue['deleteGoalSafely'] = useCallback(
    async (goalId) => {
      await repoRef.current.deleteGoal(goalId);
      if (focusedGoalId === goalId) {
        setFocusedGoalId(null);
      }
      await reloadSnapshot();
    },
    [focusedGoalId, reloadSnapshot],
  );

  const regenerateRoadmapAndSchedule = useCallback(async () => {
    if (!activeGoal) return;
    const learnerId = snapshot.learner?.id ?? 'learner_local_1';
    const existingForGoal = snapshot.learningPaths.find((p) => p.goalId === activeGoal.id) ?? null;
    const alloc = goalPrioritization.allocations.find((a) => a.goalId === activeGoal.id);
    const path = buildPersonalizedLearningPath({
      pathId: `path_${activeGoal.id}`,
      learnerId,
      goal: activeGoal,
      profile: snapshot.profile,
      learnerSkills: snapshot.learnerSkills,
      resources: allResources,
      previousPath: existingForGoal,
      allocatedWeeklyHours: alloc?.allocatedWeeklyHours,
      startDateISO: todayISO,
    });
    await repoRef.current.saveLearningPath(path);

    const schedule = generateStudySchedule({
      scheduleId: `sched_${activeGoal.id}`,
      learnerId,
      path,
      startDateISO: todayISO,
      targetEndDateISO: activeGoal.targetCompletionDate ?? snapshot.profile?.targetCompletionDate ?? null,
      availableHoursPerDay: snapshot.profile?.availableHoursPerDay ?? 2,
      studyDaysPerWeek: snapshot.profile?.studyDaysPerWeek ?? 5,
      sessionLengthMinutes: snapshot.profile?.learningPreferences.sessionLengthMinutes ?? 45,
    });
    await repoRef.current.saveStudySchedule(schedule);
    await reloadSnapshot();
  }, [
    activeGoal,
    snapshot.learner,
    snapshot.profile,
    snapshot.learnerSkills,
    snapshot.learningPaths,
    goalPrioritization.allocations,
    allResources,
    todayISO,
    reloadSnapshot,
  ]);

  const previewRoadmapChanges = useCallback((): RoadmapRegenerationPreview | null => {
    if (!activeGoal || !activePath) return null;
    const alloc = goalPrioritization.allocations.find((a) => a.goalId === activeGoal.id);
    return previewRoadmapRegeneration({
      currentPath: activePath,
      goal: activeGoal,
      profile: snapshot.profile,
      learnerSkills: snapshot.learnerSkills,
      resources: allResources,
      allocatedWeeklyHours: alloc?.allocatedWeeklyHours,
      startDateISO: todayISO,
    });
  }, [activeGoal, activePath, goalPrioritization.allocations, snapshot.profile, snapshot.learnerSkills, allResources, todayISO]);

  const toggleRoadmapActivity: AppContextValue['toggleRoadmapActivity'] = useCallback(
    async (pathId, activityId, status, actualMinutes) => {
      const target = snapshot.learningPaths.find((p) => p.id === pathId);
      if (!target) return;
      const updated = applyActivityStatusUpdate({
        path: target,
        activityId,
        status,
        actualMinutes,
      });
      await repoRef.current.saveLearningPath(updated);
      await reloadSnapshot();
    },
    [snapshot.learningPaths, reloadSnapshot],
  );

  const submitDiagnosticAssessment: AppContextValue['submitDiagnosticAssessment'] = useCallback(
    async (responses, startedAt, customAssessment, customQuestions) => {
      const learnerId = snapshot.learner?.id ?? 'learner_local_1';
      const completedAt = new Date().toISOString();
      const result = evaluateAssessmentSubmission({
        attemptId: `att_${Date.now()}`,
        learnerId,
        assessment: customAssessment ?? activeDiagnosticAssessment,
        questions: customQuestions ?? activeDiagnosticQuestions,
        responses,
        existingSkills: snapshot.learnerSkills,
        existingAttempts: snapshot.assessmentAttempts,
        startedAt,
        completedAt,
      });

      await repoRef.current.saveAssessmentSubmission(result.attempt, result.answers);
      await repoRef.current.upsertLearnerSkills(result.updatedSkills);
      setLastAssessmentResult(result);

      const updatedSnap = await reloadSnapshot();
      const adaptive = evaluateAdaptiveRules({
        learnerId,
        todayISO,
        learnerSkills: updatedSnap.learnerSkills,
        assessmentAttempts: updatedSnap.assessmentAttempts,
        quizAttempts: updatedSnap.quizAttempts,
        studySessions: updatedSnap.studySessions,
        learningPaths: updatedSnap.learningPaths,
      });
      await repoRef.current.replaceRecommendations(learnerId, adaptive.recommendations);
      await reloadSnapshot();
      return result;
    },
    [
      snapshot.learner,
      snapshot.learnerSkills,
      snapshot.assessmentAttempts,
      activeDiagnosticAssessment,
      activeDiagnosticQuestions,
      todayISO,
      reloadSnapshot,
    ],
  );

  const submitQuiz: AppContextValue['submitQuiz'] = useCallback(
    async (quizId, selectedAnswers) => {
      const quiz = BUNDLED_QUIZZES.find((q) => q.id === quizId);
      if (!quiz) throw new Error(`Quiz not found: ${quizId}`);
      const learnerId = snapshot.learner?.id ?? 'learner_local_1';
      const completedAt = new Date().toISOString();
      const attempt = evaluateQuizAttempt({
        attemptId: `qa_${Date.now()}`,
        learnerId,
        quiz,
        selectedAnswers,
        completedAt,
      });

      await repoRef.current.saveQuizAttempt(attempt);
      setLastQuizAttempt(attempt);

      // Update LearnerSkill evidence
      const existing = snapshot.learnerSkills.find((ls) => ls.skillId === quiz.skillId);
      const nextCount = (existing?.assessmentCount ?? 0) + 1;
      const nextComp =
        existing && existing.assessmentCount > 0
          ? Math.round(existing.demonstratedCompetence * 0.4 + attempt.scorePercent * 0.6)
          : attempt.scorePercent;
      const updatedSkill: LearnerSkill = {
        id: existing?.id ?? `ls_${learnerId}_${quiz.skillId}`,
        learnerId,
        skillId: quiz.skillId,
        selfReportedConfidence: existing?.selfReportedConfidence ?? 50,
        demonstratedCompetence: nextComp,
        assessmentCount: nextCount,
        lastAssessedAt: completedAt,
        status: nextComp >= 75 ? 'strong' : nextComp >= 45 ? 'weak' : 'missing',
        updatedAt: completedAt,
      };
      await repoRef.current.upsertLearnerSkills([updatedSkill]);

      const updatedSnap = await reloadSnapshot();
      const adaptive = evaluateAdaptiveRules({
        learnerId,
        todayISO,
        learnerSkills: updatedSnap.learnerSkills,
        assessmentAttempts: updatedSnap.assessmentAttempts,
        quizAttempts: updatedSnap.quizAttempts,
        studySessions: updatedSnap.studySessions,
        learningPaths: updatedSnap.learningPaths,
      });
      await repoRef.current.replaceRecommendations(learnerId, adaptive.recommendations);
      await reloadSnapshot();
      return attempt;
    },
    [snapshot.learner, snapshot.learnerSkills, todayISO, reloadSnapshot],
  );

  const completeStudySession = useCallback(
    async (session: StudySession, actualMinutes?: number) => {
      const nextStatus: CompletionStatus = session.status === 'completed' ? 'not_started' : 'completed';
      const { updatedSession } = transitionStudySession({
        session,
        nextStatus,
        actualMinutes,
      });
      await repoRef.current.updateStudySession(updatedSession);
      const now = new Date().toISOString();

      if (nextStatus === 'completed' && activePath && session.activityId) {
        const updatedStages = activePath.stages.map((st) => ({
          ...st,
          milestones: st.milestones.map((m) => {
            const nextActs = m.activities.map((a) =>
              a.id === session.activityId
                ? { ...a, status: 'completed' as const, completedAt: now }
                : a,
            );
            const allDone = nextActs.every((a) => a.status === 'completed');
            return {
              ...m,
              activities: nextActs,
              status: allDone ? ('completed' as const) : ('in_progress' as const),
            };
          }),
        }));
        await repoRef.current.saveLearningPath({
          ...activePath,
          stages: updatedStages,
          updatedAt: now,
        });
      }

      if (nextStatus === 'completed') {
        await repoRef.current.saveProgressRecord({
          id: `prog_${session.id}`,
          learnerId: session.learnerId,
          dateISO: session.dateISO,
          minutesStudied: updatedSession.actualMinutes,
          topicsCompleted: 1,
          quizzesCompleted: session.sessionType === 'assessment' ? 1 : 0,
          averageQuizScore: null,
          streakDays: metrics.currentStreakDays + 1,
          recordedAt: now,
        });
      }

      await reloadSnapshot();
    },
    [activePath, metrics.currentStreakDays, reloadSnapshot],
  );

  const updateStudySessionLifecycle: AppContextValue['updateStudySessionLifecycle'] = useCallback(
    async (session, nextStatus, options) => {
      const now = new Date().toISOString();
      const { updatedSession, continuationSession } = transitionStudySession({
        session,
        nextStatus,
        actualMinutes: options?.actualMinutes,
        notes: options?.notes,
        difficultyRating: options?.difficultyRating,
        now,
      });

      if (continuationSession && activeSchedule) {
        const updatedSessions = activeSchedule.sessions.map((s) =>
          s.id === updatedSession.id ? updatedSession : s,
        );
        updatedSessions.push(continuationSession);
        updatedSessions.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
        await repoRef.current.saveStudySchedule({
          ...activeSchedule,
          sessions: updatedSessions,
          updatedAt: now,
        });
      } else {
        await repoRef.current.updateStudySession(updatedSession);
      }

      if (
        activePath &&
        session.activityId &&
        (nextStatus === 'completed' || nextStatus === 'partially_completed')
      ) {
        const mappedActStatus: CompletionStatus =
          nextStatus === 'completed' ? 'completed' : 'in_progress';
        const updatedStages = activePath.stages.map((st) => ({
          ...st,
          milestones: st.milestones.map((m) => {
            const nextActs = m.activities.map((a) =>
              a.id === session.activityId
                ? {
                    ...a,
                    status: mappedActStatus,
                    completedAt: mappedActStatus === 'completed' ? now : a.completedAt,
                  }
                : a,
            );
            const allDone = nextActs.every((a) => a.status === 'completed');
            return {
              ...m,
              activities: nextActs,
              status: allDone ? ('completed' as const) : ('in_progress' as const),
            };
          }),
        }));
        await repoRef.current.saveLearningPath({
          ...activePath,
          stages: updatedStages,
          updatedAt: now,
        });
      }

      if (nextStatus === 'completed' || nextStatus === 'partially_completed') {
        await repoRef.current.saveProgressRecord({
          id: `prog_${session.id}`,
          learnerId: session.learnerId,
          dateISO: session.dateISO,
          minutesStudied: updatedSession.actualMinutes,
          topicsCompleted: nextStatus === 'completed' ? 1 : 0,
          quizzesCompleted: nextStatus === 'completed' && session.sessionType === 'assessment' ? 1 : 0,
          averageQuizScore: null,
          streakDays: metrics.currentStreakDays + (nextStatus === 'completed' ? 1 : 0),
          recordedAt: now,
        });
      }

      await reloadSnapshot();
    },
    [activePath, activeSchedule, metrics.currentStreakDays, reloadSnapshot],
  );

  const recalculateMissedSchedule: AppContextValue['recalculateMissedSchedule'] = useCallback(
    async (options) => {
      if (!activeSchedule) return;
      const recalculated = recalculateScheduleForMissedSessions(
        activeSchedule,
        todayISO,
        snapshot.profile?.studyDaysPerWeek ?? 5,
        options,
      );
      await repoRef.current.saveStudySchedule(recalculated);
      await reloadSnapshot();
    },
    [activeSchedule, todayISO, snapshot.profile, reloadSnapshot],
  );

  const previewMissedAndPostponedReschedule: AppContextValue['previewMissedAndPostponedReschedule'] =
    useCallback(
      (options) => {
        if (!activeSchedule) return null;
        return previewScheduleRevision({
          schedule: activeSchedule,
          referenceDateISO: todayISO,
          studyDaysPerWeek: snapshot.profile?.studyDaysPerWeek ?? 5,
          ...options,
        });
      },
      [activeSchedule, todayISO, snapshot.profile],
    );

  const applyScheduleOptions: AppContextValue['applyScheduleOptions'] = useCallback(
    async (options) => {
      if (!activeGoal || !activePath) return;
      const learnerId = snapshot.learner?.id ?? 'learner_local_1';
      const preservedCompleted = (activeSchedule?.sessions ?? []).filter(
        (s) => s.status === 'completed' || s.status === 'partially_completed',
      );
      const next = generateStudySchedule({
        scheduleId: activeSchedule?.id ?? `sched_${activeGoal.id}`,
        learnerId,
        goalId: activeGoal.id,
        path: activePath,
        startDateISO: todayISO,
        targetEndDateISO: activeGoal.targetCompletionDate ?? snapshot.profile?.targetCompletionDate ?? null,
        availableHoursPerDay: options.availableHoursOverride ?? snapshot.profile?.availableHoursPerDay ?? 2,
        studyDaysPerWeek: snapshot.profile?.studyDaysPerWeek ?? 5,
        preferredStudyDays: options.preferredStudyDays,
        preferredStartTimeHHMM: options.preferredStartTimeHHMM ?? '18:00',
        unavailableDatesISO: options.unavailableDatesISO,
        scheduleMode: options.scheduleMode ?? activeSchedule?.scheduleMode ?? 'flexible',
        studyTechnique: options.studyTechnique ?? activeSchedule?.studyTechnique ?? 'spaced_blocks',
        includeBreaks: options.includeBreaks ?? Boolean(activeSchedule?.breakConfig),
        existingSessionsToPreserve: preservedCompleted,
      });
      await repoRef.current.saveStudySchedule(next);
      await reloadSnapshot();
    },
    [activeGoal, activePath, activeSchedule, snapshot.learner, snapshot.profile, todayISO, reloadSnapshot],
  );

  const addUserResource: AppContextValue['addUserResource'] = useCallback(
    async (res) => {
      const resource: LearningResource = {
        ...res,
        id: `ures_${Date.now()}`,
        origin: 'user_imported',
        isDownloadedOffline: true,
        updatedAt: new Date().toISOString(),
      };
      await repoRef.current.saveUserResource(resource);
      await reloadSnapshot();
    },
    [reloadSnapshot],
  );

  const toggleOfflineDownloadResource = useCallback(
    async (resourceId: string) => {
      const existing = allResources.find((r) => r.id === resourceId);
      if (!existing) return;
      await repoRef.current.saveUserResource({
        ...existing,
        isDownloadedOffline: !existing.isDownloadedOffline,
        updatedAt: new Date().toISOString(),
      });
      await reloadSnapshot();
    },
    [allResources, reloadSnapshot],
  );

  const refreshAdaptiveRecommendations = useCallback(async () => {
    const learnerId = snapshot.learner?.id ?? 'learner_local_1';
    const adaptive = evaluateAdaptiveRules({
      learnerId,
      todayISO,
      learnerSkills: snapshot.learnerSkills,
      assessmentAttempts: snapshot.assessmentAttempts,
      quizAttempts: snapshot.quizAttempts,
      studySessions: snapshot.studySessions,
      learningPaths: snapshot.learningPaths,
      goals: snapshot.goals,
      schedules: snapshot.studySchedules,
      prerequisites: CORE_PREREQUISITES,
      skills: CORE_SKILLS,
      preferredFormat: snapshot.profile?.preferredFormat,
    });
    await repoRef.current.replaceRecommendations(learnerId, adaptive.recommendations);
    await reloadSnapshot();
    return adaptive.recommendations;
  }, [snapshot, todayISO, reloadSnapshot]);

  const respondToRecommendation: AppContextValue['respondToRecommendation'] = useCallback(
    async (recId, decision) => {
      const learnerId = snapshot.learner?.id;
      if (!learnerId) return;
      const updated = snapshot.recommendations.map((r) =>
        r.id === recId
          ? {
              ...r,
              status: decision,
              dismissed: decision === 'dismissed',
            }
          : r,
      );
      await repoRef.current.replaceRecommendations(learnerId, updated);
      await reloadSnapshot();
    },
    [snapshot.learner, snapshot.recommendations, reloadSnapshot],
  );

  const confirmAndApplyAdaptiveAdjustments = useCallback(async () => {
    if (!activeGoal || !activePath) return;
    const learnerId = snapshot.learner?.id ?? 'learner_local_1';
    const alloc = goalPrioritization.allocations.find((a) => a.goalId === activeGoal.id);
    const revisedPath = buildPersonalizedLearningPath({
      pathId: activePath.id,
      learnerId,
      goal: activeGoal,
      profile: snapshot.profile,
      learnerSkills: snapshot.learnerSkills,
      resources: allResources,
      previousPath: activePath,
      allocatedWeeklyHours: alloc?.allocatedWeeklyHours,
      startDateISO: todayISO,
    });
    await repoRef.current.saveLearningPath(revisedPath);

    if (activeSchedule) {
      const revisedSched = recalculateScheduleForMissedSessions(
        activeSchedule,
        todayISO,
        snapshot.profile?.studyDaysPerWeek ?? 5,
      );
      await repoRef.current.saveStudySchedule(revisedSched);
    }
    await refreshAdaptiveRecommendations();
  }, [
    activeGoal,
    activePath,
    activeSchedule,
    snapshot.learner,
    snapshot.profile,
    snapshot.learnerSkills,
    goalPrioritization.allocations,
    allResources,
    todayISO,
    refreshAdaptiveRecommendations,
  ]);

  const updateSettings = useCallback(
    async (partial: Partial<ApplicationSettings>) => {
      const next: ApplicationSettings = {
        ...snapshot.settings,
        ...partial,
        updatedAt: new Date().toISOString(),
      };
      await repoRef.current.saveSettings(next);
      await reloadSnapshot();
    },
    [snapshot.settings, reloadSnapshot],
  );

  const exportBackupJson = useCallback(async () => {
    const envelope = await exportSnapshotToBackup(snapshot, 'web');
    return JSON.stringify(envelope, null, 2);
  }, [snapshot]);

  const importBackupJson = useCallback(
    async (rawJson: string) => {
      const parsed = await validateAndParseImportBackup(rawJson);
      if (!parsed.ok) {
        return { ok: false, message: parsed.error };
      }
      await repoRef.current.importBackup(parsed.envelope);
      await reloadSnapshot();
      return { ok: true, message: 'Backup verified (SHA-256) and imported into IndexedDB.' };
    },
    [reloadSnapshot],
  );

  const resetAllLocalData = useCallback(async () => {
    await repoRef.current.clearAllData();
    await reloadSnapshot();
    setScreen('welcome');
  }, [reloadSnapshot]);

  const value: AppContextValue = {
    ready,
    screen,
    navigate: setScreen,
    isOnline,
    snapshot,
    activeGoal,
    focusedGoalId,
    setFocusedGoalId,
    goalPrioritization,
    activePath,
    roadmapProgressStats,
    activeSchedule,
    skillGap,
    metrics,
    allResources,
    selectedResourceId,
    setSelectedResourceId,
    selectedQuizId,
    setSelectedQuizId,
    lastAssessmentResult,
    activeDiagnosticAssessment,
    activeDiagnosticQuestions,
    assessmentHistorySummary,
    lastQuizAttempt,
    aiCapabilities,
    aiStatus,
    advisoryService: advisoryRef.current,
    provider: providerRef.current,
    initializeLocalModel,
    unloadLocalModel,
    deleteLocalModelCache,
    saveProfile,
    selectOrCreateGoal,
    updateGoalDetails,
    changeGoalStatus,
    changeGoalPriority,
    deleteGoalSafely,
    submitDiagnosticAssessment,
    submitQuiz,
    regenerateRoadmapAndSchedule,
    previewRoadmapChanges,
    toggleRoadmapActivity,
    completeStudySession,
    updateStudySessionLifecycle,
    recalculateMissedSchedule,
    previewMissedAndPostponedReschedule,
    applyScheduleOptions,
    addUserResource,
    toggleOfflineDownloadResource,
    adaptivePlanPreview,
    refreshAdaptiveRecommendations,
    respondToRecommendation,
    confirmAndApplyAdaptiveAdjustments,
    updateSettings,
    exportBackupJson,
    importBackupJson,
    resetAllLocalData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
