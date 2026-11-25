import { z } from 'zod';
import type { BackupEnvelope } from '@alc/shared-types';

export const MAX_BACKUP_FILE_BYTES = 25 * 1024 * 1024; // 25 MB limit for secure file import
export const MAX_TEXT_INPUT_LENGTH = 8000;

export const AcademicLevelSchema = z.enum([
  'high_school',
  'undergraduate',
  'graduate',
  'working_professional',
  'self_learner',
]);

export const LearningFormatSchema = z.enum([
  'reading',
  'hands_on_projects',
  'interactive_quizzes',
  'mixed',
]);

export const GoalCategorySchema = z.string().trim().min(1).max(80);

export const CompletionStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'completed',
  'partially_completed',
  'skipped',
  'postponed',
]);

export const LearnerSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1).max(120),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const LearnerProfileSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  educationalBackground: z.string().min(1).max(300),
  academicLevel: AcademicLevelSchema,
  interests: z.array(z.string()),
  careerAspirations: z.string(),
  selfReportedSkills: z.array(z.string()),
  targetSkills: z.array(z.string()),
  availableHoursPerDay: z.number().min(0.25).max(16),
  studyDaysPerWeek: z.number().int().min(1).max(7),
  preferredFormat: LearningFormatSchema,
  preferredLanguage: z.string().min(2),
  targetCompletionDate: z.string().nullable(),
  learningPreferences: z.object({
    sessionLengthMinutes: z.number().int().min(5).max(240),
    revisionFrequencyDays: z.number().int().min(1).max(30),
    dailyReminderTime: z.string().nullable(),
  }),
  history: z.array(
    z.object({
      timestamp: z.string(),
      changedFields: z.array(z.string()),
      note: z.string(),
    }),
  ),
  updatedAt: z.string().min(1),
});

export const GoalLifecycleStatusSchema = z.enum(['active', 'paused', 'completed', 'archived']);
export const GoalPrioritySchema = z.enum(['high', 'medium', 'low']);
export const GoalHorizonSchema = z.enum(['short_term', 'long_term']);
export const GoalKindSchema = z.enum(['academic', 'professional', 'examination', 'personal']);
export const GoalInterpretationModeSchema = z.enum(['llm_local', 'deterministic_fallback', 'manual']);

export const LearningGoalSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  category: GoalCategorySchema,
  domainId: z.string().optional(),
  subjectId: z.string().optional(),
  title: z.string().min(1),
  rawDescription: z.string(),
  structuredObjectives: z.array(z.string()),
  targetSkillIds: z.array(z.string()),
  interpretedByAI: z.boolean(),
  interpretationMode: GoalInterpretationModeSchema.optional(),
  status: GoalLifecycleStatusSchema.optional(),
  priority: GoalPrioritySchema.optional(),
  priorityRank: z.number().int().min(1).max(100).optional(),
  horizon: GoalHorizonSchema.optional(),
  goalKind: GoalKindSchema.optional(),
  targetCompletionDate: z.string().nullable().optional(),
  expectedProficiency: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  learningPurpose: z.string().max(400).optional(),
  estimatedScopeHours: z.number().min(0).optional(),
  history: z
    .array(
      z.object({
        timestamp: z.string(),
        changedFields: z.array(z.string()),
        note: z.string(),
      }),
    )
    .optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const LearnerSkillSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  skillId: z.string().min(1),
  selfReportedConfidence: z.number().min(0).max(100),
  demonstratedCompetence: z.number().min(0).max(100),
  assessmentCount: z.number().int().min(0),
  lastAssessedAt: z.string().nullable(),
  status: z.enum(['strong', 'weak', 'missing', 'unassessed']),
  updatedAt: z.string(),
});

export const AssessmentAttemptSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  assessmentId: z.string().min(1),
  startedAt: z.string(),
  completedAt: z.string(),
  scorePercent: z.number().min(0).max(100),
  totalQuestions: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  averageConfidence: z.number().min(0).max(5),
  totalTimeSeconds: z.number().min(0),
  evaluationMethod: z.string().optional(),
  completionStatus: z.enum(['completed', 'in_progress_saved', 'pending_review']).optional(),
  misconceptionFlags: z.array(z.string()).optional(),
  reinforcementFlags: z.array(z.string()).optional(),
  adaptiveNextDifficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  skillBreakdown: z.record(
    z.string(),
    z.object({
      correct: z.number().int().min(0),
      total: z.number().int().min(0),
      scorePercent: z.number().min(0).max(100),
    }),
  ),
});

export const AssessmentAnswerSchema = z.object({
  id: z.string().min(1),
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  skillId: z.string().min(1),
  selectedOptionIndex: z.number().int(),
  selectedOptionIndices: z.array(z.number().int()).optional(),
  numericAnswer: z.number().nullable().optional(),
  unitAnswer: z.string().nullable().optional(),
  textAnswer: z.string().nullable().optional(),
  earnedScorePercent: z.number().min(0).max(100).optional(),
  evaluationMethod: z.string().optional(),
  pendingReview: z.boolean().optional(),
  isCorrect: z.boolean(),
  confidenceRating: z.number().min(1).max(5),
  timeSpentSeconds: z.number().min(0),
});

export const LearningPathSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  goalId: z.string().min(1),
  title: z.string().min(1),
  objective: z.string(),
  totalEstimatedHours: z.number().min(0),
  weeklyHoursBudget: z.number().min(0).optional(),
  estimatedWeeks: z.number().min(0).optional(),
  deadlineStatus: z
    .object({
      realistic: z.boolean(),
      warning: z.string().nullable(),
    })
    .optional(),
  blockedSkillIds: z.array(z.string()).optional(),
  regenerationSummary: z.string().optional(),
  stages: z.array(z.any()),
  generatedAt: z.string(),
  updatedAt: z.string(),
});

export const StudySessionSchema = z.object({
  id: z.string().min(1),
  scheduleId: z.string().min(1),
  learnerId: z.string().min(1),
  goalId: z.string().optional(),
  dateISO: z.string().min(10),
  startTimeHHMM: z.string().nullable().optional(),
  endTimeHHMM: z.string().nullable().optional(),
  skillId: z.string().min(1),
  activityId: z.string().nullable(),
  title: z.string().min(1),
  sessionType: z.enum(['topic', 'revision', 'assessment', 'project', 'break']),
  plannedMinutes: z.number().int().min(1),
  actualMinutes: z.number().int().min(0),
  status: CompletionStatusSchema,
  notes: z.string(),
  scheduleReason: z.string().optional(),
  startedAt: z.string().nullable().optional(),
  difficultyRating: z.number().int().min(1).max(5).nullable().optional(),
  completedAt: z.string().nullable(),
});

export const StudyScheduleSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  pathId: z.string().min(1),
  startDateISO: z.string(),
  targetEndDateISO: z.string(),
  dailyAvailableMinutes: z.number().int().min(15),
  isRealistic: z.boolean(),
  feasibilityWarning: z.string().nullable(),
  totalPlannedHours: z.number().min(0),
  scheduleMode: z.enum(['flexible', 'fixed']).optional(),
  studyTechnique: z.enum(['pomodoro', 'deep_focus', 'spaced_blocks', 'custom']).optional(),
  breakConfig: z
    .object({
      shortBreakMinutes: z.number().int().min(0).max(60),
      longBreakMinutes: z.number().int().min(0).max(120),
      sessionsBeforeLongBreak: z.number().int().min(1).max(12),
    })
    .optional(),
  conflicts: z
    .array(
      z.object({
        dateISO: z.string(),
        reason: z.string(),
        severity: z.enum(['warning', 'overload']),
      }),
    )
    .optional(),
  schedulingSummary: z.string().optional(),
  sessions: z.array(StudySessionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProgressRecordSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  dateISO: z.string(),
  minutesStudied: z.number().min(0),
  topicsCompleted: z.number().int().min(0),
  quizzesCompleted: z.number().int().min(0),
  averageQuizScore: z.number().nullable(),
  averageMasteryPercent: z.number().min(0).max(100).nullable().optional(),
  completedMilestonesCount: z.number().int().min(0).optional(),
  streakDays: z.number().int().min(0),
  recordedAt: z.string(),
});

export const RecommendationSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  trigger: z.enum([
    'repeated_low_scores',
    'consistent_mastery',
    'missed_deadlines',
    'milestone_completed',
    'weak_practical_performance',
    'unassessed_prerequisites',
    'insufficient_evidence',
    'retention_review_due',
    'activity_format_shift',
    'unrealistic_goal_revision',
    'next_eligible_skill',
  ]),
  recommendationType: z
    .enum([
      'revisit_weak_topic',
      'review_prerequisite',
      'adjust_difficulty',
      'repeat_assessment',
      'schedule_revision',
      'advance_next_skill',
      'adjust_activity_type',
      'revise_goal',
      'update_priority',
      'additional_practice',
    ])
    .optional(),
  targetDomainId: z.string().nullable().optional(),
  title: z.string(),
  rationale: z.string(),
  supportingEvidence: z.array(z.string()).optional(),
  aiExplanation: z.string().nullable(),
  targetSkillId: z.string().nullable(),
  suggestedAction: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  requiresConfirmation: z.boolean().optional(),
  status: z.enum(['pending', 'accepted', 'dismissed']).optional(),
  dismissed: z.boolean(),
  createdAt: z.string(),
});

export const QuizAttemptSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  quizId: z.string().min(1),
  skillId: z.string().min(1),
  scorePercent: z.number().min(0).max(100),
  correctCount: z.number().int().min(0),
  totalQuestions: z.number().int().min(0),
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOptionIndex: z.number().int(),
      isCorrect: z.boolean(),
    }),
  ),
  completedAt: z.string(),
});

export const LearningResourceSchema = z.object({
  id: z.string().min(1),
  skillId: z.string().min(1),
  domainId: z.string().optional(),
  subjectId: z.string().optional(),
  title: z.string().min(1),
  summary: z.string(),
  contentMarkdown: z.string(),
  codeExample: z.string().nullable(),
  practicePrompt: z.string().nullable(),
  origin: z.enum(['bundled', 'user_imported', 'optional_external']),
  contentStatus: z.enum(['available', 'partial', 'imported', 'user_created', 'planned']).optional(),
  externalUrl: z.string().nullable(),
  isDownloadedOffline: z.boolean(),
  estimatedMinutes: z.number().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  updatedAt: z.string(),
});

export const ApplicationSettingsSchema = z.object({
  id: z.string().min(1),
  theme: z.enum(['dark_navy', 'midnight_charcoal']),
  offlineOnlyMode: z.boolean(),
  requireWifiForModelDownload: z.boolean(),
  privacyStrictLocalOnly: z.boolean(),
  autoAdaptSchedule: z.boolean(),
  activeModelId: z.string().min(1),
  updatedAt: z.string(),
});

export const LearningPreferencesInputSchema = z.object({
  sessionLengthMinutes: z.number().int().min(5).max(240),
  revisionFrequencyDays: z.number().int().min(1).max(30),
  dailyReminderTime: z.string().max(10).nullable(),
});

export const LearnerProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  educationalBackground: z.string().trim().min(1).max(300),
  academicLevel: AcademicLevelSchema,
  interests: z.array(z.string().trim().min(1).max(80)).max(25),
  careerAspirations: z.string().trim().min(1).max(500),
  selfReportedSkills: z.array(z.string().trim().min(1).max(80)).max(50),
  targetSkills: z.array(z.string().trim().min(1).max(80)).max(50),
  availableHoursPerDay: z.number().min(0.25).max(16),
  studyDaysPerWeek: z.number().int().min(1).max(7),
  preferredFormat: LearningFormatSchema,
  preferredLanguage: z.string().trim().min(2).max(40),
  targetCompletionDate: z.string().nullable(),
  learningPreferences: LearningPreferencesInputSchema.optional(),
});

// Structured AI output validation schemas
export const AIGoalInterpretationSchema = z.object({
  normalizedTitle: z.string().min(3).max(140),
  suggestedCategory: GoalCategorySchema,
  structuredObjectives: z.array(z.string().min(4).max(240)).min(2).max(8),
  recommendedSkillSlugs: z.array(z.string().min(2).max(80)).min(1).max(15),
  rationale: z.string().min(10).max(600),
  domainName: z.string().max(120).optional(),
  subjectName: z.string().max(160).optional(),
  expectedProficiency: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  learningPurpose: z.string().max(300).optional(),
  currentKnowledgeAssumptions: z.array(z.string().max(200)).max(6).optional(),
  missingInformation: z.array(z.string().max(200)).max(6).optional(),
});

export const AISkillGapExplanationSchema = z.object({
  summary: z.string().min(10).max(800),
  priorityFocus: z.array(z.string().min(3).max(200)).min(1).max(6),
  studyAdvice: z.string().min(10).max(600),
});

export const AIRoadmapAdvisorySchema = z.object({
  executiveSummary: z.string().min(10).max(800),
  milestoneTips: z.array(z.string().min(5).max(240)).min(1).max(8),
  projectIdeas: z.array(z.string().min(5).max(240)).min(1).max(5),
});

export const AITutorResponseSchema = z.object({
  answer: z.string().min(5).max(4000),
  keyTakeaways: z.array(z.string().min(3).max(240)).max(5),
  suggestedPractice: z.string().max(400).optional(),
});

export type AIGoalInterpretation = z.infer<typeof AIGoalInterpretationSchema>;
export type AISkillGapExplanation = z.infer<typeof AISkillGapExplanationSchema>;
export type AIRoadmapAdvisory = z.infer<typeof AIRoadmapAdvisorySchema>;
export type AITutorResponse = z.infer<typeof AITutorResponseSchema>;

export const BackupEnvelopeSchema = z.object({
  metadata: z.object({
    schemaVersion: z.number().int().min(1),
    appVersion: z.string().min(1),
    exportedAt: z.string().min(1),
    sourcePlatform: z.enum(['web', 'android', 'ios']),
    checksumSha256: z.string().min(32),
    recordCounts: z.record(z.string(), z.number()),
  }),
  data: z.object({
    learner: LearnerSchema.nullable(),
    profile: LearnerProfileSchema.nullable(),
    goals: z.array(LearningGoalSchema),
    learnerSkills: z.array(LearnerSkillSchema),
    assessmentAttempts: z.array(AssessmentAttemptSchema),
    assessmentAnswers: z.array(AssessmentAnswerSchema),
    learningPaths: z.array(LearningPathSchema),
    studySchedules: z.array(StudyScheduleSchema),
    studySessions: z.array(StudySessionSchema),
    progressRecords: z.array(ProgressRecordSchema),
    recommendations: z.array(RecommendationSchema),
    quizAttempts: z.array(QuizAttemptSchema),
    userResources: z.array(LearningResourceSchema),
    settings: ApplicationSettingsSchema,
  }),
});

export function validateBackupSize(byteLength: number): { valid: boolean; error?: string } {
  if (byteLength <= 0) {
    return { valid: false, error: 'Backup file is empty.' };
  }
  if (byteLength > MAX_BACKUP_FILE_BYTES) {
    return {
      valid: false,
      error: `Backup file exceeds maximum allowed size (${MAX_BACKUP_FILE_BYTES / (1024 * 1024)} MB).`,
    };
  }
  return { valid: true };
}

export function validateSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeTextInput(input: string, maxLength = MAX_TEXT_INPUT_LENGTH): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maxLength);
}

const SENSITIVE_KEY_PATTERN = /(token|secret|password|apikey|api_key|authorization|credential)/i;

export function safeRedactForLog<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => safeRedactForLog(item)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    if (SENSITIVE_KEY_PATTERN.test(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = safeRedactForLog(v);
    }
  }
  return out as T;
}

export function hasUnsafePrototypeKeys(rawJson: string): boolean {
  return /"(?:__proto__|constructor|prototype)"\s*:/.test(rawJson);
}

export function parseBackupEnvelope(rawJson: string): { ok: true; value: BackupEnvelope } | { ok: false; error: string } {
  if (hasUnsafePrototypeKeys(rawJson)) {
    return { ok: false, error: 'Backup rejected: unsafe prototype key detected.' };
  }
  try {
    const parsed = JSON.parse(rawJson);
    const result = BackupEnvelopeSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
    }
    return { ok: true, value: result.data as BackupEnvelope };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid JSON backup format' };
  }
}
