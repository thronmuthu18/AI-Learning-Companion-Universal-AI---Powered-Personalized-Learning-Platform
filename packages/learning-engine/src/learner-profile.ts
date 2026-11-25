import type {
  AcademicLevel,
  Learner,
  LearnerProfile,
  LearnerSkill,
  LearningFormat,
  ProfileHistoryEntry,
} from '@alc/shared-types';
import { defaultDomainRegistry, type DomainRegistry } from './universal-catalog';

export interface LearningPreferencesDraft {
  sessionLengthMinutes: number;
  revisionFrequencyDays: number;
  dailyReminderTime: string | null;
}

export interface LearnerProfileDraft {
  displayName: string;
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
  learningPreferences?: LearningPreferencesDraft;
  note?: string;
}

export interface OnboardingCompletenessSummary {
  percentComplete: number;
  weeklyStudyHoursCapacity: number;
  completedChecklist: string[];
  missingChecklist: string[];
}

export const DEFAULT_LEARNING_PREFERENCES: LearningPreferencesDraft = {
  sessionLengthMinutes: 45,
  revisionFrequencyDays: 4,
  dailyReminderTime: '19:00',
};

function normalizeArray(items: string[]): string[] {
  return Array.from(new Set(items.map((x) => x.trim()).filter(Boolean)));
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, idx) => item === b[idx]);
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * Computes field-level changes between an existing learner/profile and a draft update.
 */
export function diffProfileChanges(
  prevLearner: Learner | null,
  prevProfile: LearnerProfile | null,
  nextDraft: LearnerProfileDraft,
  nextPrefs: LearningPreferencesDraft,
): { changedFields: string[]; note: string } {
  if (!prevProfile) {
    return {
      changedFields: ['initial_onboarding'],
      note: nextDraft.note?.trim() || 'Completed initial local learner onboarding',
    };
  }

  const changedFields: string[] = [];
  if (prevLearner && prevLearner.displayName !== nextDraft.displayName) {
    changedFields.push('displayName');
  }
  if (prevProfile.educationalBackground !== nextDraft.educationalBackground) {
    changedFields.push('educationalBackground');
  }
  if (prevProfile.academicLevel !== nextDraft.academicLevel) {
    changedFields.push('academicLevel');
  }
  if (!sameStringArray(prevProfile.interests, normalizeArray(nextDraft.interests))) {
    changedFields.push('interests');
  }
  if (prevProfile.careerAspirations !== nextDraft.careerAspirations) {
    changedFields.push('careerAspirations');
  }
  if (!sameStringArray(prevProfile.selfReportedSkills, normalizeArray(nextDraft.selfReportedSkills))) {
    changedFields.push('selfReportedSkills');
  }
  if (!sameStringArray(prevProfile.targetSkills, normalizeArray(nextDraft.targetSkills))) {
    changedFields.push('targetSkills');
  }
  if (prevProfile.availableHoursPerDay !== nextDraft.availableHoursPerDay) {
    changedFields.push('availableHoursPerDay');
  }
  if (prevProfile.studyDaysPerWeek !== nextDraft.studyDaysPerWeek) {
    changedFields.push('studyDaysPerWeek');
  }
  if (prevProfile.preferredFormat !== nextDraft.preferredFormat) {
    changedFields.push('preferredFormat');
  }
  if (prevProfile.preferredLanguage !== nextDraft.preferredLanguage) {
    changedFields.push('preferredLanguage');
  }
  if ((prevProfile.targetCompletionDate ?? null) !== (nextDraft.targetCompletionDate ?? null)) {
    changedFields.push('targetCompletionDate');
  }

  const prevPrefs = prevProfile.learningPreferences;
  if (
    prevPrefs.sessionLengthMinutes !== nextPrefs.sessionLengthMinutes ||
    prevPrefs.revisionFrequencyDays !== nextPrefs.revisionFrequencyDays ||
    (prevPrefs.dailyReminderTime ?? null) !== (nextPrefs.dailyReminderTime ?? null)
  ) {
    changedFields.push('learningPreferences');
  }

  const defaultNote =
    changedFields.length > 0
      ? `Updated fields: ${changedFields.join(', ')}`
      : 'Saved profile without field modifications';

  return {
    changedFields: changedFields.length > 0 ? changedFields : ['no_changes'],
    note: nextDraft.note?.trim() || defaultNote,
  };
}

/**
 * Seeds `'unassessed'` `LearnerSkill` rows for newly self-reported skills across any domain.
 * Never assigns verified competence or overwrites existing assessment-backed skills.
 */
export function seedUnassessedSkillsForProfile(params: {
  learnerId: string;
  selfReportedSkills: string[];
  existingLearnerSkills: LearnerSkill[];
  registry?: DomainRegistry;
  timestamp?: string;
}): LearnerSkill[] {
  const {
    learnerId,
    selfReportedSkills,
    existingLearnerSkills,
    registry = defaultDomainRegistry,
    timestamp = new Date().toISOString(),
  } = params;

  const existingBySkillId = new Set(existingLearnerSkills.map((ls) => ls.skillId));
  const allSkills = registry.getAllSkills();
  const newlySeeded: LearnerSkill[] = [];

  for (const token of normalizeArray(selfReportedSkills)) {
    const matched = allSkills.find(
      (s) =>
        s.id === token ||
        s.slug === token ||
        s.name.toLowerCase() === token.toLowerCase(),
    );
    if (matched && !existingBySkillId.has(matched.id)) {
      existingBySkillId.add(matched.id);
      newlySeeded.push({
        id: `ls_${learnerId}_${matched.id}`,
        learnerId,
        skillId: matched.id,
        selfReportedConfidence: 60,
        demonstratedCompetence: 0,
        assessmentCount: 0,
        lastAssessedAt: null,
        status: 'unassessed',
        updatedAt: timestamp,
      });
    }
  }

  return newlySeeded;
}

/**
 * Builds persisted Learner, LearnerProfile (with history audit entry), and unassessed skill seeds
 * identically for Web IndexedDB and Mobile SQLite.
 */
export function buildLearnerAndProfileUpdate(params: {
  existingLearner: Learner | null;
  existingProfile: LearnerProfile | null;
  existingLearnerSkills: LearnerSkill[];
  input: LearnerProfileDraft;
  defaultLearnerId?: string;
  defaultProfileId?: string;
  registry?: DomainRegistry;
  now?: string;
}): {
  learner: Learner;
  profile: LearnerProfile;
  newlySeededSkills: LearnerSkill[];
  changedFields: string[];
} {
  const {
    existingLearner,
    existingProfile,
    existingLearnerSkills,
    input,
    defaultLearnerId = 'learner_local_1',
    defaultProfileId = 'profile_local_1',
    registry = defaultDomainRegistry,
    now = new Date().toISOString(),
  } = params;

  const learner: Learner = existingLearner
    ? { ...existingLearner, displayName: input.displayName.trim(), updatedAt: now }
    : {
        id: defaultLearnerId,
        displayName: input.displayName.trim(),
        createdAt: now,
        updatedAt: now,
      };

  const basePrefs = existingProfile?.learningPreferences ?? DEFAULT_LEARNING_PREFERENCES;
  const nextPrefs: LearningPreferencesDraft = {
    sessionLengthMinutes: Math.round(
      clamp(input.learningPreferences?.sessionLengthMinutes ?? basePrefs.sessionLengthMinutes, 5, 240),
    ),
    revisionFrequencyDays: Math.round(
      clamp(input.learningPreferences?.revisionFrequencyDays ?? basePrefs.revisionFrequencyDays, 1, 30),
    ),
    dailyReminderTime:
      input.learningPreferences !== undefined
        ? input.learningPreferences.dailyReminderTime
        : basePrefs.dailyReminderTime,
  };

  const normalizedDraft: LearnerProfileDraft = {
    ...input,
    displayName: input.displayName.trim(),
    educationalBackground: input.educationalBackground.trim(),
    interests: normalizeArray(input.interests),
    careerAspirations: input.careerAspirations.trim(),
    selfReportedSkills: normalizeArray(input.selfReportedSkills),
    targetSkills: normalizeArray(input.targetSkills),
    availableHoursPerDay: Number(clamp(input.availableHoursPerDay, 0.25, 16).toFixed(2)),
    studyDaysPerWeek: Math.round(clamp(input.studyDaysPerWeek, 1, 7)),
    preferredLanguage: input.preferredLanguage.trim() || 'English',
    targetCompletionDate: input.targetCompletionDate?.trim() ? input.targetCompletionDate.trim() : null,
    learningPreferences: nextPrefs,
  };

  const diff = diffProfileChanges(existingLearner, existingProfile, normalizedDraft, nextPrefs);
  const historyEntry: ProfileHistoryEntry = {
    timestamp: now,
    changedFields: diff.changedFields,
    note: diff.note,
  };

  const profile: LearnerProfile = {
    id: existingProfile?.id ?? defaultProfileId,
    learnerId: learner.id,
    educationalBackground: normalizedDraft.educationalBackground,
    academicLevel: normalizedDraft.academicLevel,
    interests: normalizedDraft.interests,
    careerAspirations: normalizedDraft.careerAspirations,
    selfReportedSkills: normalizedDraft.selfReportedSkills,
    targetSkills: normalizedDraft.targetSkills,
    availableHoursPerDay: normalizedDraft.availableHoursPerDay,
    studyDaysPerWeek: normalizedDraft.studyDaysPerWeek,
    preferredFormat: normalizedDraft.preferredFormat,
    preferredLanguage: normalizedDraft.preferredLanguage,
    targetCompletionDate: normalizedDraft.targetCompletionDate,
    learningPreferences: nextPrefs,
    history: [...(existingProfile?.history ?? []), historyEntry],
    updatedAt: now,
  };

  const newlySeededSkills = seedUnassessedSkillsForProfile({
    learnerId: learner.id,
    selfReportedSkills: normalizedDraft.selfReportedSkills,
    existingLearnerSkills,
    registry,
    timestamp: now,
  });

  return {
    learner,
    profile,
    newlySeededSkills,
    changedFields: diff.changedFields,
  };
}

/**
 * Summarizes real profile completeness and weekly study budget from persisted data.
 */
export function computeOnboardingCompleteness(
  learner: Learner | null,
  profile: LearnerProfile | null,
): OnboardingCompletenessSummary {
  const checks: Array<{ label: string; ok: boolean }> = [
    { label: 'Learner display name', ok: Boolean(learner?.displayName.trim()) },
    { label: 'Educational background', ok: Boolean(profile?.educationalBackground.trim()) },
    { label: 'Learning interests', ok: Boolean(profile && profile.interests.length > 0) },
    { label: 'Learning or career aspirations', ok: Boolean(profile?.careerAspirations.trim()) },
    { label: 'Target skills or subjects', ok: Boolean(profile && profile.targetSkills.length > 0) },
    { label: 'Study schedule & learning preferences', ok: Boolean(profile && profile.availableHoursPerDay > 0) },
  ];

  const completedChecklist = checks.filter((c) => c.ok).map((c) => c.label);
  const missingChecklist = checks.filter((c) => !c.ok).map((c) => c.label);
  const percentComplete = Math.round((completedChecklist.length / checks.length) * 100);
  const weeklyStudyHoursCapacity = profile
    ? Number((profile.availableHoursPerDay * profile.studyDaysPerWeek).toFixed(1))
    : 0;

  return {
    percentComplete,
    weeklyStudyHoursCapacity,
    completedChecklist,
    missingChecklist,
  };
}
