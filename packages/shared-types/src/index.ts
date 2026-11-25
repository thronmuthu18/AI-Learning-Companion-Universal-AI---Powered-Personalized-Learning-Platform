export type PlatformKind = 'web' | 'android' | 'ios';

export type AcademicLevel =
  | 'high_school'
  | 'undergraduate'
  | 'graduate'
  | 'working_professional'
  | 'self_learner';

export type LearningFormat =
  | 'reading'
  | 'hands_on_projects'
  | 'interactive_quizzes'
  | 'mixed';

export type GoalCategory = string;

export type ContentAvailabilityStatus =
  | 'available'
  | 'partial'
  | 'imported'
  | 'user_created'
  | 'planned';

export type ActivityKind =
  | 'lesson'
  | 'video_audio'
  | 'mcq'
  | 'multiple_select'
  | 'descriptive'
  | 'short_answer'
  | 'numerical'
  | 'coding'
  | 'exercise'
  | 'practical'
  | 'case_study'
  | 'scenario'
  | 'conceptual'
  | 'project'
  | 'flashcard'
  | 'revision'
  | 'quiz';

export type AssessmentQuestionType =
  | 'mcq'
  | 'multiple_select'
  | 'numerical'
  | 'descriptive'
  | 'short_answer'
  | 'coding'
  | 'practical'
  | 'case_study'
  | 'scenario'
  | 'conceptual'
  | 'flashcard';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type SkillGapCategory =
  | 'strong'
  | 'weak'
  | 'missing'
  | 'unassessed';

export type SessionType = 'topic' | 'revision' | 'assessment' | 'project' | 'break';

export type CompletionStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'partially_completed'
  | 'skipped'
  | 'postponed';

export type StudyTechnique = 'pomodoro' | 'deep_focus' | 'spaced_blocks' | 'custom';
export type StudyScheduleMode = 'flexible' | 'fixed';

export type ResourceOrigin = 'bundled' | 'user_imported' | 'optional_external';

export type RecommendationTrigger =
  | 'repeated_low_scores'
  | 'consistent_mastery'
  | 'missed_deadlines'
  | 'milestone_completed'
  | 'weak_practical_performance'
  | 'unassessed_prerequisites'
  | 'insufficient_evidence'
  | 'retention_review_due'
  | 'activity_format_shift'
  | 'unrealistic_goal_revision'
  | 'next_eligible_skill';

export type ModelLoadState =
  | 'not_installed'
  | 'downloading'
  | 'verifying'
  | 'installed'
  | 'loading'
  | 'ready'
  | 'generating'
  | 'error'
  | 'unsupported';

export interface Learner {
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileHistoryEntry {
  timestamp: string;
  changedFields: string[];
  note: string;
}

export interface LearnerProfile {
  id: string;
  learnerId: string;
  educationalBackground: string;
  academicLevel: AcademicLevel;
  interests: string[];
  careerAspirations: string;
  selfReportedSkills: string[];
  targetSkills: string[];
  availableHoursPerDay: number;
  studyDaysPerWeek: number;
  preferredFormat: LearningFormat;
  preferredLanguage: string;
  targetCompletionDate: string | null;
  learningPreferences: {
    sessionLengthMinutes: number;
    revisionFrequencyDays: number;
    dailyReminderTime: string | null;
  };
  history: ProfileHistoryEntry[];
  updatedAt: string;
}

export type GoalLifecycleStatus = 'active' | 'paused' | 'completed' | 'archived';
export type GoalPriority = 'high' | 'medium' | 'low';
export type GoalHorizon = 'short_term' | 'long_term';
export type GoalKind = 'academic' | 'professional' | 'examination' | 'personal';
export type GoalInterpretationMode = 'llm_local' | 'deterministic_fallback' | 'manual';

export interface GoalHistoryEntry {
  timestamp: string;
  changedFields: string[];
  note: string;
}

export interface LearningGoal {
  id: string;
  learnerId: string;
  category: GoalCategory;
  domainId?: string;
  subjectId?: string;
  title: string;
  rawDescription: string;
  structuredObjectives: string[];
  targetSkillIds: string[];
  interpretedByAI: boolean;
  interpretationMode?: GoalInterpretationMode;
  status?: GoalLifecycleStatus;
  priority?: GoalPriority;
  priorityRank?: number;
  horizon?: GoalHorizon;
  goalKind?: GoalKind;
  targetCompletionDate?: string | null;
  expectedProficiency?: DifficultyLevel;
  learningPurpose?: string;
  estimatedScopeHours?: number;
  history?: GoalHistoryEntry[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DomainDefinition {
  id: string;
  name: string;
  summary: string;
  contentStatus: ContentAvailabilityStatus;
}

export interface DomainCategory {
  id: string;
  domainId: string;
  name: string;
}

export interface SubjectDefinition {
  id: string;
  domainId: string;
  categoryId: string;
  name: string;
  description: string;
  contentStatus: ContentAvailabilityStatus;
  defaultAssessmentModes: AssessmentQuestionType[];
}

export interface TopicDefinition {
  id: string;
  subjectId: string;
  name: string;
  orderIndex: number;
}

export interface SubtopicDefinition {
  id: string;
  topicId: string;
  name: string;
  orderIndex: number;
}

export interface AssessmentBlueprint {
  id: string;
  subjectId: string;
  supportedQuestionTypes: AssessmentQuestionType[];
  recommendedDurationMinutes: number;
  passingThresholdPercent: number;
}

export interface Skill {
  id: string;
  slug: string;
  name: string;
  domain: string;
  domainId?: string;
  categoryId?: string;
  subjectId?: string;
  topicId?: string;
  subtopicId?: string;
  description: string;
  difficulty: DifficultyLevel;
  estimatedHours: number;
  recommendedActivityTypes?: ActivityKind[];
  contentStatus?: ContentAvailabilityStatus;
}

export interface SkillPrerequisite {
  id: string;
  skillId: string;
  prerequisiteSkillId: string;
  strictness: 'required' | 'recommended';
}

export interface LearnerSkill {
  id: string;
  learnerId: string;
  skillId: string;
  selfReportedConfidence: number; // 0-100 (self-reported only)
  demonstratedCompetence: number; // 0-100 (assessment-backed)
  assessmentCount: number;
  lastAssessedAt: string | null;
  status: SkillGapCategory;
  updatedAt: string;
}

export interface AssessmentRubricCriterion {
  id: string;
  description: string;
  keywords?: string[];
  maxPoints: number;
}

export interface CodingTestCaseSpec {
  id: string;
  description: string;
  requiredPatterns: string[];
  forbiddenPatterns?: string[];
}

export type AssessmentEvaluationMethod =
  | 'objective_exact'
  | 'multiple_select_partial'
  | 'numerical_tolerance'
  | 'coding_static_cases'
  | 'rubric_manual'
  | 'rubric_keyword_baseline'
  | 'flashcard_self_recall'
  | 'pending_review'
  | 'local_llama_advisory'
  | 'mixed';

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  skillId: string;
  questionType?: AssessmentQuestionType;
  difficulty: DifficultyLevel;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  correctOptionIndices?: number[];
  expectedNumericAnswer?: number;
  numericTolerance?: number;
  expectedUnit?: string;
  acceptableUnits?: string[];
  rubricCriteria?: AssessmentRubricCriterion[];
  codingTestCases?: CodingTestCaseSpec[];
  referenceAnswer?: string;
  explanation: string;
  incorrectFeedback: string;
  estimatedSeconds: number;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  kind: 'diagnostic' | 'topic' | 'milestone';
  targetSkillIds: string[];
  difficulty: DifficultyLevel;
  questionIds: string[];
  createdAt: string;
}

export interface AssessmentAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  skillId: string;
  selectedOptionIndex: number;
  selectedOptionIndices?: number[];
  numericAnswer?: number | null;
  unitAnswer?: string | null;
  textAnswer?: string | null;
  earnedScorePercent?: number;
  evaluationMethod?: AssessmentEvaluationMethod;
  pendingReview?: boolean;
  isCorrect: boolean;
  confidenceRating: number; // 1-5
  timeSpentSeconds: number;
}

export interface AssessmentAttempt {
  id: string;
  learnerId: string;
  assessmentId: string;
  startedAt: string;
  completedAt: string;
  scorePercent: number;
  totalQuestions: number;
  correctCount: number;
  averageConfidence: number;
  totalTimeSeconds: number;
  evaluationMethod?: AssessmentEvaluationMethod;
  completionStatus?: 'completed' | 'in_progress_saved' | 'pending_review';
  misconceptionFlags?: string[];
  reinforcementFlags?: string[];
  adaptiveNextDifficulty?: DifficultyLevel;
  skillBreakdown: Record<string, { correct: number; total: number; scorePercent: number }>;
}

export interface LearningActivity {
  id: string;
  milestoneId: string;
  skillId: string;
  title: string;
  type: ActivityKind;
  resourceId: string | null;
  estimatedMinutes: number;
  actualMinutes?: number;
  reason?: string;
  contentAvailability?: ContentAvailabilityStatus;
  status: CompletionStatus;
  completedAt: string | null;
}

export interface LearningMilestone {
  id: string;
  stageId: string;
  title: string;
  description: string;
  skillIds: string[];
  prerequisiteSkillIds: string[];
  estimatedHours: number;
  readinessState?: 'ready' | 'blocked' | 'completed';
  reason?: string;
  completionCriteria: string;
  assessmentId: string | null;
  projectPrompt: string | null;
  activities: LearningActivity[];
  status: CompletionStatus;
  orderIndex: number;
}

export interface LearningStage {
  id: string;
  pathId: string;
  title: string;
  description: string;
  orderIndex: number;
  estimatedHours: number;
  milestones: LearningMilestone[];
  status: CompletionStatus;
}

export interface LearningPath {
  id: string;
  learnerId: string;
  goalId: string;
  title: string;
  objective: string;
  totalEstimatedHours: number;
  weeklyHoursBudget?: number;
  estimatedWeeks?: number;
  deadlineStatus?: { realistic: boolean; warning: string | null };
  blockedSkillIds?: string[];
  regenerationSummary?: string;
  stages: LearningStage[];
  generatedAt: string;
  updatedAt: string;
}

export interface StudyBreakConfig {
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

export interface ScheduleConflict {
  dateISO: string;
  reason: string;
  severity: 'warning' | 'overload';
}

export interface StudySession {
  id: string;
  scheduleId: string;
  learnerId: string;
  goalId?: string;
  dateISO: string; // YYYY-MM-DD
  startTimeHHMM?: string | null;
  endTimeHHMM?: string | null;
  skillId: string;
  activityId: string | null;
  title: string;
  sessionType: SessionType;
  plannedMinutes: number;
  actualMinutes: number;
  status: CompletionStatus;
  notes: string;
  scheduleReason?: string;
  startedAt?: string | null;
  difficultyRating?: number | null;
  completedAt: string | null;
}

export interface StudySchedule {
  id: string;
  learnerId: string;
  pathId: string;
  startDateISO: string;
  targetEndDateISO: string;
  dailyAvailableMinutes: number;
  isRealistic: boolean;
  feasibilityWarning: string | null;
  totalPlannedHours: number;
  scheduleMode?: StudyScheduleMode;
  studyTechnique?: StudyTechnique;
  breakConfig?: StudyBreakConfig;
  conflicts?: ScheduleConflict[];
  schedulingSummary?: string;
  sessions: StudySession[];
  createdAt: string;
  updatedAt: string;
}

export interface ProgressRecord {
  id: string;
  learnerId: string;
  dateISO: string;
  minutesStudied: number;
  topicsCompleted: number;
  quizzesCompleted: number;
  averageQuizScore: number | null;
  averageMasteryPercent?: number | null;
  completedMilestonesCount?: number;
  streakDays: number;
  recordedAt: string;
}

export interface DomainProgressConfig {
  masteryThresholdPercent?: number;
  weakThresholdPercent?: number;
  retentionWindowDays?: number;
  minAssessmentsForEvidence?: number;
}

export interface RetentionEstimate {
  skillId: string;
  skillName: string;
  domainId: string;
  lastVerifiedAt: string | null;
  daysSinceLastReview: number | null;
  lastAssessmentScorePercent: number | null;
  repeatedLowScoreCount: number;
  confidenceVsCompetenceGap: number | null;
  suggestedRevisionIntervalDays: number;
  nextRecommendedReviewDateISO: string | null;
  retentionRisk: 'low' | 'moderate' | 'high' | 'insufficient_data';
  needsReassessment: boolean;
  explanation: string;
}

export interface SkillProgressBreakdown {
  skillId: string;
  skillName: string;
  domainId: string;
  subjectId: string;
  topicId: string;
  status: SkillGapCategory;
  selfReportedConfidence: number;
  demonstratedCompetence: number;
  assessmentCount: number;
  hasSufficientEvidence: boolean;
  confidenceGap: number;
  isOverconfident: boolean;
  activitiesCompleted: number;
  activitiesTotal: number;
  studyMinutesLogged: number;
  retentionRisk: RetentionEstimate['retentionRisk'];
}

export interface TopicProgressBreakdown {
  topicKey: string;
  topicName: string;
  domainId: string;
  completedActivities: number;
  totalActivities: number;
  completionPercent: number;
  studyMinutesLogged: number;
  assessedSkillCount: number;
  totalSkillCount: number;
  demonstratedMasteryPercent: number | null;
  evidenceStatus: 'insufficient' | 'partial' | 'sufficient';
}

export interface DomainProgressBreakdown {
  domainId: string;
  domainName: string;
  goalCount: number;
  completedActivities: number;
  pendingActivities: number;
  skippedActivities: number;
  completionPercent: number;
  studyHoursLogged: number;
  strongSkillsCount: number;
  weakSkillsCount: number;
  missingSkillsCount: number;
  unassessedSkillsCount: number;
  demonstratedMasteryPercent: number | null;
  averageConfidencePercent: number | null;
  evidenceStatus: 'insufficient' | 'partial' | 'sufficient';
}

export interface GoalProgressBreakdown {
  goalId: string;
  title: string;
  domainId: string;
  priority: GoalPriority;
  status: GoalLifecycleStatus;
  completedActivities: number;
  totalActivities: number;
  roadmapCompletionPercent: number;
  completedMilestones: number;
  totalMilestones: number;
  loggedStudyHours: number;
  plannedStudyHours: number;
  assessedTargetSkills: number;
  totalTargetSkills: number;
  demonstratedMasteryPercent: number | null;
  hasSufficientEvidence: boolean;
  deadlineRealistic: boolean;
}

export interface ProgressHistorySnapshot {
  dateISO: string;
  cumulativeMinutesStudied: number;
  topicsCompleted: number;
  assessmentsCompleted: number;
  averageScorePercent: number | null;
}

export type AdaptiveRecommendationType =
  | 'revisit_weak_topic'
  | 'review_prerequisite'
  | 'adjust_difficulty'
  | 'repeat_assessment'
  | 'schedule_revision'
  | 'advance_next_skill'
  | 'adjust_activity_type'
  | 'revise_goal'
  | 'update_priority'
  | 'additional_practice';

export interface Recommendation {
  id: string;
  learnerId: string;
  trigger: RecommendationTrigger;
  recommendationType?: AdaptiveRecommendationType;
  targetDomainId?: string | null;
  title: string;
  rationale: string;
  supportingEvidence?: string[];
  aiExplanation: string | null;
  targetSkillId: string | null;
  suggestedAction: string;
  priority: 'high' | 'medium' | 'low';
  requiresConfirmation?: boolean;
  status?: 'pending' | 'accepted' | 'dismissed';
  dismissed: boolean;
  createdAt: string;
}

export interface LearningResource {
  id: string;
  skillId: string;
  domainId?: string;
  subjectId?: string;
  title: string;
  summary: string;
  contentMarkdown: string;
  codeExample: string | null;
  practicePrompt: string | null;
  origin: ResourceOrigin;
  contentStatus?: ContentAvailabilityStatus;
  externalUrl: string | null;
  isDownloadedOffline: boolean;
  estimatedMinutes: number;
  difficulty: DifficultyLevel;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  skillId: string;
  difficulty: DifficultyLevel;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  skillId: string;
  difficulty: DifficultyLevel;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  learnerId: string;
  quizId: string;
  skillId: string;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  answers: Array<{
    questionId: string;
    selectedOptionIndex: number;
    isCorrect: boolean;
  }>;
  completedAt: string;
}

export interface ModelConfiguration {
  id: string;
  modelId: string;
  displayName: string;
  family: 'llama-3.2';
  parameterSize: '1B' | '3B';
  quantization: string;
  platform: PlatformKind;
  backend: 'webgpu' | 'xnnpack' | 'coreml' | 'mps';
  contextLength: number;
  temperature: number;
  maxTokens: number;
  minRamMb: number;
  estimatedStorageMb: number;
  licenseName: string;
  licenseUrl: string;
  expectedSha256: string | null;
  isDefault: boolean;
}

export interface ModelDownload {
  id: string;
  modelId: string;
  platform: PlatformKind;
  state: ModelLoadState;
  progressPercent: number;
  bytesDownloaded: number;
  totalBytes: number;
  localModelPath: string | null;
  localTokenizerPath: string | null;
  verifiedSha256: string | null;
  errorMessage: string | null;
  updatedAt: string;
}

export interface ApplicationSettings {
  id: string;
  theme: 'dark_navy' | 'midnight_charcoal';
  offlineOnlyMode: boolean;
  requireWifiForModelDownload: boolean;
  privacyStrictLocalOnly: boolean;
  autoAdaptSchedule: boolean;
  activeModelId: string;
  updatedAt: string;
}

export interface BackupMetadata {
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  sourcePlatform: PlatformKind;
  checksumSha256: string;
  recordCounts: Record<string, number>;
}

export interface BackupEnvelope {
  metadata: BackupMetadata;
  data: {
    learner: Learner | null;
    profile: LearnerProfile | null;
    goals: LearningGoal[];
    learnerSkills: LearnerSkill[];
    assessmentAttempts: AssessmentAttempt[];
    assessmentAnswers: AssessmentAnswer[];
    learningPaths: LearningPath[];
    studySchedules: StudySchedule[];
    studySessions: StudySession[];
    progressRecords: ProgressRecord[];
    recommendations: Recommendation[];
    quizAttempts: QuizAttempt[];
    userResources: LearningResource[];
    settings: ApplicationSettings;
  };
}

export type AppScreenId =
  | 'splash'
  | 'welcome'
  | 'onboarding'
  | 'profile'
  | 'goals'
  | 'assessment'
  | 'assessment_results'
  | 'skill_gap'
  | 'roadmap'
  | 'daily_planner'
  | 'weekly_planner'
  | 'monthly_targets'
  | 'library'
  | 'content_viewer'
  | 'ai_assistant'
  | 'quiz'
  | 'quiz_results'
  | 'dashboard'
  | 'recommendations'
  | 'history'
  | 'model_settings'
  | 'model_downloads'
  | 'inference_poc'
  | 'data_export'
  | 'data_import'
  | 'app_settings'
  | 'privacy_settings'
  | 'about';
