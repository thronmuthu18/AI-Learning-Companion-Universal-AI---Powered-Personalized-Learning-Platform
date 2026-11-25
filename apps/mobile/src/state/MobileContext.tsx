import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type {
  ApplicationSettings,
  Assessment,
  AssessmentQuestion,
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
import { LocalAIAdvisoryService, NativeExecuTorchProvider } from '@alc/ai-adapters';
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
import { execuTorchBridge } from '../../modules/executorch-llama/src';
import { SQLiteLearningRepository } from '../storage/sqlite-repository';

interface MobileContextValue {
  ready: boolean;
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
  provider: NativeExecuTorchProvider;
  modelFilePath: string | null;
  tokenizerFilePath: string | null;
  pickAndInstallModelFile: (kind: 'pte' | 'tokenizer') => Promise<string | null>;
  initializeNativeLlama: () => Promise<void>;
  saveProfile: (input: LearnerProfileDraft) => Promise<void>;
  selectOrCreateGoal: (
    category: GoalCategory,
    customTitle?: string,
    customTargetSkillIds?: string[],
    domainId?: string,
    options?: {
      priority?: GoalPriority;
      targetCompletionDate?: string | null;
      goalKind?: GoalKind;
      horizon?: GoalHorizon;
      interpretedByAI?: boolean;
      interpretationMode?: LearningGoal['interpretationMode'];
      structuredObjectives?: string[];
      rawDescription?: string;
    },
  ) => Promise<void>;
  updateGoalDetails: (
    goalId: string,
    patch: Partial<Pick<LearningGoal, 'title' | 'rawDescription' | 'targetCompletionDate' | 'priority' | 'horizon' | 'goalKind' | 'targetSkillIds'>>,
    note?: string,
  ) => Promise<void>;
  changeGoalStatus: (goalId: string, status: GoalLifecycleStatus, note?: string) => Promise<void>;
  changeGoalPriority: (goalId: string, priority: GoalPriority) => Promise<void>;
  deleteGoalSafely: (goalId: string) => Promise<void>;
  submitDiagnostic: (
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
  toggleSessionDone: (session: StudySession) => Promise<void>;
  updateStudySessionLifecycle: (
    session: StudySession,
    nextStatus: CompletionStatus,
    options?: {
      actualMinutes?: number;
      notes?: string;
      difficultyRating?: number | null;
    },
  ) => Promise<void>;
  recalculateMissed: (options?: {
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
  adaptivePlanPreview: AdaptivePlanAdjustmentPreview | null;
  refreshAdaptive: () => Promise<void>;
  respondToRecommendation: (recId: string, decision: 'accepted' | 'dismissed') => Promise<void>;
  confirmAndApplyAdaptiveAdjustments: () => Promise<void>;
  exportJsonBackupFile: () => Promise<string>;
  importJsonBackupFile: () => Promise<{ ok: boolean; message: string }>;
  updateSettings: (partial: Partial<ApplicationSettings>) => Promise<void>;
  resetAllData: () => Promise<void>;
}

const MobileContext = createContext<MobileContextValue | null>(null);

export const MobileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const repoRef = useRef(new SQLiteLearningRepository(platform));
  const providerRef = useRef(new NativeExecuTorchProvider(platform, execuTorchBridge));
  const advisoryRef = useRef(new LocalAIAdvisoryService(providerRef.current));

  const [ready, setReady] = useState(false);
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
    settings: createDefaultSettings(platform),
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
  const [modelFilePath, setModelFilePath] = useState<string | null>(null);
  const [tokenizerFilePath, setTokenizerFilePath] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const next = await repoRef.current.loadSnapshot();
    setSnapshot(next);
    const savedModel = next.modelDownloads[0];
    if (savedModel?.localModelPath) setModelFilePath(savedModel.localModelPath);
    if (savedModel?.localTokenizerPath) setTokenizerFilePath(savedModel.localTokenizerPath);
    return next;
  }, []);

  useEffect(() => {
    (async () => {
      await repoRef.current.initialize();
      await reload();
      try {
        const caps = await providerRef.current.getCapabilities();
        setAiCapabilities(caps);
      } catch {
        // Native module capability query failed if running in unsupported shell
      }
      setReady(true);
    })();
  }, [reload]);

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
      return snapshot.learningPaths.find((p) => p.goalId === activeGoal.id) ?? snapshot.learningPaths[0] ?? null;
    }
    return snapshot.learningPaths[0] ?? null;
  }, [snapshot.learningPaths, activeGoal]);

  const roadmapProgressStats = useMemo(
    () => (activePath ? computeRoadmapProgressStats(activePath) : null),
    [activePath],
  );

  const activeSchedule = useMemo(() => {
    const sc =
      (activePath ? snapshot.studySchedules.find((s) => s.pathId === activePath.id) : null) ??
      snapshot.studySchedules[0] ??
      null;
    if (!sc) return null;
    const matched = snapshot.studySessions.filter((s) => s.scheduleId === sc.id);
    return {
      ...sc,
      sessions: matched.length > 0 ? matched : sc.sessions,
    };
  }, [snapshot.studySchedules, snapshot.studySessions, activePath]);

  const allResources = useMemo(
    () => filterValidResources([...BUNDLED_LEARNING_RESOURCES, ...snapshot.userResources]),
    [snapshot.userResources],
  );

  const skillGap = useMemo(() => {
    const targets = activeGoal?.targetSkillIds ?? snapshot.profile?.targetSkills ?? [];
    const targetProficiencyPercent =
      activeGoal?.expectedProficiency === 'advanced'
        ? 80
        : activeGoal?.expectedProficiency === 'beginner'
          ? 65
          : 75;
    return analyzeSkillGap({
      targetSkillIds: targets,
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

  const pickAndInstallModelFile = useCallback(
    async (kind: 'pte' | 'tokenizer'): Promise<string | null> => {
      const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets[0]) return null;

      const asset = picked.assets[0];
      const modelDir = `${FileSystem.documentDirectory}models/`;
      await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
      const destName = kind === 'pte' ? 'llama-3.2-1b-instruct.pte' : 'tokenizer.model';
      const destPath = `${modelDir}${destName}`;
      await FileSystem.copyAsync({ from: asset.uri, to: destPath });

      const cleanFsPath = destPath.replace(/^file:\/\//, '');
      const sha256 = await execuTorchBridge.verifyFileSha256(cleanFsPath);

      if (kind === 'pte') setModelFilePath(cleanFsPath);
      else setTokenizerFilePath(cleanFsPath);

      await repoRef.current.saveModelDownload({
        id: 'executorch_llama_32_1b',
        modelId: 'llama-3.2-1b-instruct-xnnpack-q4',
        platform,
        state: 'installed',
        progressPercent: 100,
        bytesDownloaded: asset.size ?? 0,
        totalBytes: asset.size ?? 0,
        localModelPath: kind === 'pte' ? cleanFsPath : modelFilePath,
        localTokenizerPath: kind === 'tokenizer' ? cleanFsPath : tokenizerFilePath,
        verifiedSha256: sha256,
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      });
      await reload();
      return sha256;
    },
    [platform, modelFilePath, tokenizerFilePath, reload],
  );

  const initializeNativeLlama = useCallback(async () => {
    if (!modelFilePath || !tokenizerFilePath) {
      throw new Error('Select both the exported Llama 3.2 `.pte` model file and `tokenizer.model` first.');
    }
    await providerRef.current.initialize(
      {
        modelId: 'llama-3.2-1b-instruct-xnnpack-q4',
        modelPath: modelFilePath,
        tokenizerPath: tokenizerFilePath,
        temperature: 0.6,
      },
      () => {
        setAiStatus(providerRef.current.getModelStatus());
      },
    );
    setAiStatus(providerRef.current.getModelStatus());
  }, [modelFilePath, tokenizerFilePath]);

  const saveProfile: MobileContextValue['saveProfile'] = useCallback(
    async (input) => {
      const { learner, profile, newlySeededSkills } = buildLearnerAndProfileUpdate({
        existingLearner: snapshot.learner,
        existingProfile: snapshot.profile,
        existingLearnerSkills: snapshot.learnerSkills,
        input: {
          ...input,
          note: input.note ?? 'Saved locally on mobile device',
        },
        defaultLearnerId: 'learner_mobile_1',
        defaultProfileId: 'profile_mobile_1',
      });
      await repoRef.current.saveLearnerAndProfile(learner, profile);
      if (newlySeededSkills.length > 0) {
        await repoRef.current.upsertLearnerSkills(newlySeededSkills);
      }
      await reload();
    },
    [snapshot.learner, snapshot.profile, snapshot.learnerSkills, reload],
  );

  const selectOrCreateGoal = useCallback(
    async (
      category: GoalCategory,
      customTitle?: string,
      customTargetSkillIds?: string[],
      domainId?: string,
      options?: {
        priority?: GoalPriority;
        targetCompletionDate?: string | null;
        goalKind?: GoalKind;
        horizon?: GoalHorizon;
        interpretedByAI?: boolean;
        interpretationMode?: LearningGoal['interpretationMode'];
        structuredObjectives?: string[];
        rawDescription?: string;
      },
    ) => {
      const tpl = GOAL_TEMPLATES.find((g) => g.category === category);
      const targetSkillIds =
        customTargetSkillIds && customTargetSkillIds.length > 0
          ? customTargetSkillIds
          : tpl?.targetSkillIds ?? [];
      if (targetSkillIds.length === 0) {
        throw new Error('Select at least one target skill or subject before generating a roadmap.');
      }
      const learnerId = snapshot.learner?.id ?? 'learner_mobile_1';
      const now = new Date().toISOString();
      const goal = createLearningGoal({
        learnerId,
        category,
        domainId,
        title: customTitle?.trim() ? customTitle.trim() : tpl?.title ?? String(category),
        rawDescription:
          options?.rawDescription ??
          tpl?.description ??
          `Personalized learning pathway for ${customTitle ?? category}`,
        structuredObjectives:
          options?.structuredObjectives ??
          tpl?.defaultObjectives ?? ['Assess baseline knowledge', 'Close prerequisite gaps'],
        targetSkillIds,
        interpretedByAI: options?.interpretedByAI ?? false,
        interpretationMode: options?.interpretationMode,
        priority: options?.priority,
        goalKind: options?.goalKind,
        horizon: options?.horizon,
        targetCompletionDate: options?.targetCompletionDate ?? snapshot.profile?.targetCompletionDate ?? null,
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
      });
      await repoRef.current.saveStudySchedule(schedule);
      await reload();
    },
    [snapshot.learner, snapshot.profile, snapshot.learnerSkills, allResources, todayISO, reload],
  );

  const updateGoalDetails: MobileContextValue['updateGoalDetails'] = useCallback(
    async (goalId, patch, note) => {
      const found = snapshot.goals.find((g) => g.id === goalId);
      if (!found) return;
      await repoRef.current.saveGoal(updateLearningGoal(found, patch, note));
      await reload();
    },
    [snapshot.goals, reload],
  );

  const changeGoalStatus: MobileContextValue['changeGoalStatus'] = useCallback(
    async (goalId, status, note) => {
      const found = snapshot.goals.find((g) => g.id === goalId);
      if (!found) return;
      await repoRef.current.saveGoal(transitionGoalStatus(found, status, note));
      await reload();
    },
    [snapshot.goals, reload],
  );

  const changeGoalPriority: MobileContextValue['changeGoalPriority'] = useCallback(
    async (goalId, priority) => {
      const found = snapshot.goals.find((g) => g.id === goalId);
      if (!found) return;
      await repoRef.current.saveGoal(setGoalPriority(found, priority));
      await reload();
    },
    [snapshot.goals, reload],
  );

  const deleteGoalSafely: MobileContextValue['deleteGoalSafely'] = useCallback(
    async (goalId) => {
      await repoRef.current.deleteGoal(goalId);
      if (focusedGoalId === goalId) setFocusedGoalId(null);
      await reload();
    },
    [focusedGoalId, reload],
  );

  const submitDiagnostic: MobileContextValue['submitDiagnostic'] = useCallback(
    async (responses, startedAt, customAssessment, customQuestions) => {
      const learnerId = snapshot.learner?.id ?? 'learner_mobile_1';
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
      await reload();
      return result;
    },
    [
      snapshot.learner,
      snapshot.learnerSkills,
      snapshot.assessmentAttempts,
      activeDiagnosticAssessment,
      activeDiagnosticQuestions,
      reload,
    ],
  );

  const submitQuiz = useCallback(
    async (quizId: string, selectedAnswers: Record<string, number>) => {
      const quiz = BUNDLED_QUIZZES.find((q) => q.id === quizId)!;
      const learnerId = snapshot.learner?.id ?? 'learner_mobile_1';
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
      await reload();
      return attempt;
    },
    [snapshot.learner, reload],
  );

  const toggleSessionDone = useCallback(
    async (session: StudySession) => {
      const nextStatus: CompletionStatus = session.status === 'completed' ? 'not_started' : 'completed';
      const { updatedSession } = transitionStudySession({
        session,
        nextStatus,
      });
      await repoRef.current.updateStudySession(updatedSession);
      await reload();
    },
    [reload],
  );

  const updateStudySessionLifecycle: MobileContextValue['updateStudySessionLifecycle'] = useCallback(
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

      await reload();
    },
    [activePath, activeSchedule, metrics.currentStreakDays, reload],
  );

  const regenerateRoadmapAndSchedule = useCallback(async () => {
    if (!activeGoal) return;
    const learnerId = snapshot.learner?.id ?? 'learner_mobile_1';
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
    });
    await repoRef.current.saveStudySchedule(schedule);
    await reload();
  }, [
    activeGoal,
    snapshot.learner,
    snapshot.profile,
    snapshot.learnerSkills,
    snapshot.learningPaths,
    goalPrioritization.allocations,
    allResources,
    todayISO,
    reload,
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

  const toggleRoadmapActivity: MobileContextValue['toggleRoadmapActivity'] = useCallback(
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
      await reload();
    },
    [snapshot.learningPaths, reload],
  );

  const recalculateMissed: MobileContextValue['recalculateMissed'] = useCallback(
    async (options) => {
      if (!activeSchedule) return;
      const next = recalculateScheduleForMissedSessions(
        activeSchedule,
        todayISO,
        snapshot.profile?.studyDaysPerWeek ?? 5,
        options,
      );
      await repoRef.current.saveStudySchedule(next);
      await reload();
    },
    [activeSchedule, todayISO, snapshot.profile, reload],
  );

  const previewMissedAndPostponedReschedule: MobileContextValue['previewMissedAndPostponedReschedule'] =
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

  const applyScheduleOptions: MobileContextValue['applyScheduleOptions'] = useCallback(
    async (options) => {
      if (!activeGoal || !activePath) return;
      const learnerId = snapshot.learner?.id ?? 'learner_mobile_1';
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
      await reload();
    },
    [activeGoal, activePath, activeSchedule, snapshot.learner, snapshot.profile, todayISO, reload],
  );

  const refreshAdaptive = useCallback(async () => {
    const learnerId = snapshot.learner?.id ?? 'learner_mobile_1';
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
    await reload();
  }, [snapshot, todayISO, reload]);

  const respondToRecommendation: MobileContextValue['respondToRecommendation'] = useCallback(
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
      await reload();
    },
    [snapshot.learner, snapshot.recommendations, reload],
  );

  const confirmAndApplyAdaptiveAdjustments = useCallback(async () => {
    if (!activeGoal || !activePath) return;
    const learnerId = snapshot.learner?.id ?? 'learner_mobile_1';
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
    await refreshAdaptive();
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
    refreshAdaptive,
  ]);

  const exportJsonBackupFile = useCallback(async () => {
    const envelope = await exportSnapshotToBackup(snapshot, platform);
    const outPath = `${FileSystem.documentDirectory}alc-backup-${todayISO}.json`;
    await FileSystem.writeAsStringAsync(outPath, JSON.stringify(envelope, null, 2));
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(outPath);
    }
    return outPath;
  }, [snapshot, platform, todayISO]);

  const importJsonBackupFile = useCallback(async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (picked.canceled || !picked.assets[0]) {
      return { ok: false, message: 'Import cancelled.' };
    }
    const raw = await FileSystem.readAsStringAsync(picked.assets[0].uri);
    const parsed = await validateAndParseImportBackup(raw);
    if (!parsed.ok) return { ok: false, message: parsed.error };
    await repoRef.current.importBackup(parsed.envelope);
    await reload();
    return { ok: true, message: 'Backup verified (SHA-256) and imported into local SQLite.' };
  }, [reload]);

  const updateSettings = useCallback(
    async (partial: Partial<ApplicationSettings>) => {
      await repoRef.current.saveSettings({
        ...snapshot.settings,
        ...partial,
        updatedAt: new Date().toISOString(),
      });
      await reload();
    },
    [snapshot.settings, reload],
  );

  const resetAllData = useCallback(async () => {
    await repoRef.current.clearAllData();
    await reload();
  }, [reload]);

  return (
    <MobileContext.Provider
      value={{
        ready,
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
        modelFilePath,
        tokenizerFilePath,
        pickAndInstallModelFile,
        initializeNativeLlama,
        saveProfile,
        selectOrCreateGoal,
        updateGoalDetails,
        changeGoalStatus,
        changeGoalPriority,
        deleteGoalSafely,
        submitDiagnostic,
        submitQuiz,
        regenerateRoadmapAndSchedule,
        previewRoadmapChanges,
        toggleRoadmapActivity,
        toggleSessionDone,
        updateStudySessionLifecycle,
        recalculateMissed,
        previewMissedAndPostponedReschedule,
        applyScheduleOptions,
        adaptivePlanPreview,
        refreshAdaptive,
        respondToRecommendation,
        confirmAndApplyAdaptiveAdjustments,
        exportJsonBackupFile,
        importJsonBackupFile,
        updateSettings,
        resetAllData,
      }}
    >
      {children}
    </MobileContext.Provider>
  );
};

export function useMobile(): MobileContextValue {
  const ctx = useContext(MobileContext);
  if (!ctx) throw new Error('useMobile must be used inside MobileProvider');
  return ctx;
}
