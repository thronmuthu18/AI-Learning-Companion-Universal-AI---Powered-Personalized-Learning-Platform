import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildLearnerAndProfileUpdate,
  computeOnboardingCompleteness,
  diffProfileChanges,
  seedUnassessedSkillsForProfile,
} from '@alc/learning-engine';
import { IndexedDBLearningRepository } from '../apps/web/src/storage/indexeddb-repository';
import { createDefaultSettings, exportSnapshotToBackup, validateAndParseImportBackup } from '@alc/storage';
import { LearnerProfileInputSchema } from '@alc/validation';
import type { LearnerSkill } from '@alc/shared-types';

describe('Phase 08 — Learner Onboarding & Profile', () => {
  it('validates and builds initial onboarding across domains while seeding unassessed baselines', () => {
    const rawDraft = {
      displayName: 'Karthik Rao',
      educationalBackground: 'B.E. Electronics & Communication Engineering',
      academicLevel: 'undergraduate' as const,
      interests: ['Signals & Systems', 'Financial Accounting'],
      careerAspirations: 'Crack GATE ECE with top rank and learn corporate finance basics',
      selfReportedSkills: ['ece-network-theory', 'accounting-double-entry-basics'],
      targetSkills: ['ece-signals-systems', 'acct-statements'],
      availableHoursPerDay: 2.5,
      studyDaysPerWeek: 6,
      preferredFormat: 'mixed' as const,
      preferredLanguage: 'English',
      targetCompletionDate: '2027-02-01',
      learningPreferences: {
        sessionLengthMinutes: 55,
        revisionFrequencyDays: 3,
        dailyReminderTime: '20:30',
      },
    };

    const parsed = LearnerProfileInputSchema.safeParse(rawDraft);
    expect(parsed.success).toBe(true);

    const created = buildLearnerAndProfileUpdate({
      existingLearner: null,
      existingProfile: null,
      existingLearnerSkills: [],
      input: rawDraft,
      defaultLearnerId: 'learner_p8_1',
      defaultProfileId: 'profile_p8_1',
      now: '2026-11-25T10:00:00Z',
    });

    expect(created.learner.id).toBe('learner_p8_1');
    expect(created.learner.displayName).toBe('Karthik Rao');
    expect(created.changedFields).toEqual(['initial_onboarding']);
    expect(created.profile.history).toHaveLength(1);
    expect(created.profile.learningPreferences).toEqual({
      sessionLengthMinutes: 55,
      revisionFrequencyDays: 3,
      dailyReminderTime: '20:30',
    });

    // Self-reported skills seed unassessed baselines without fabricating verified mastery
    expect(created.newlySeededSkills.map((s) => s.skillId)).toEqual([
      'ece-network-theory',
      'acct-basics',
    ]);
    for (const ls of created.newlySeededSkills) {
      expect(ls.status).toBe('unassessed');
      expect(ls.assessmentCount).toBe(0);
      expect(ls.demonstratedCompetence).toBe(0);
    }

    const summary = computeOnboardingCompleteness(created.learner, created.profile);
    expect(summary.percentComplete).toBe(100);
    expect(summary.weeklyStudyHoursCapacity).toBe(15);
    expect(summary.missingChecklist).toEqual([]);
  });

  it('tracks exact field-level change history and preserves verified assessment skills on edit', () => {
    const initial = buildLearnerAndProfileUpdate({
      existingLearner: null,
      existingProfile: null,
      existingLearnerSkills: [],
      input: {
        displayName: 'Meera Nair',
        educationalBackground: 'B.Com Honours',
        academicLevel: 'graduate',
        interests: ['Cost Accounting'],
        careerAspirations: 'Financial Controller',
        selfReportedSkills: ['acct-basics'],
        targetSkills: ['acct-statements'],
        availableHoursPerDay: 2,
        studyDaysPerWeek: 5,
        preferredFormat: 'reading',
        preferredLanguage: 'English',
        targetCompletionDate: null,
      },
      now: '2026-11-25T09:00:00Z',
    });

    const verifiedExisting: LearnerSkill[] = [
      {
        id: 'ls_acct_basics',
        learnerId: initial.learner.id,
        skillId: 'acct-basics',
        selfReportedConfidence: 60,
        demonstratedCompetence: 88,
        assessmentCount: 2,
        lastAssessedAt: '2026-11-25T09:30:00Z',
        status: 'strong',
        updatedAt: '2026-11-25T09:30:00Z',
      },
    ];

    const updated = buildLearnerAndProfileUpdate({
      existingLearner: initial.learner,
      existingProfile: initial.profile,
      existingLearnerSkills: verifiedExisting,
      input: {
        displayName: 'Meera Nair',
        educationalBackground: 'B.Com Honours',
        academicLevel: 'working_professional',
        interests: ['Cost Accounting', 'Managerial Finance'],
        careerAspirations: 'Financial Controller',
        selfReportedSkills: ['acct-basics', 'phys-mechanics'],
        targetSkills: ['acct-cost-managerial'],
        availableHoursPerDay: 1.5,
        studyDaysPerWeek: 5,
        preferredFormat: 'hands_on_projects',
        preferredLanguage: 'English',
        targetCompletionDate: '2027-06-01',
        learningPreferences: {
          sessionLengthMinutes: 40,
          revisionFrequencyDays: 5,
          dailyReminderTime: '07:30',
        },
      },
      now: '2026-11-25T12:00:00Z',
    });

    expect(updated.changedFields).toEqual([
      'academicLevel',
      'interests',
      'selfReportedSkills',
      'targetSkills',
      'availableHoursPerDay',
      'preferredFormat',
      'targetCompletionDate',
      'learningPreferences',
    ]);
    expect(updated.profile.history).toHaveLength(2);
    expect(updated.profile.history[1]!.note).toContain('academicLevel');

    // Never overwrite verified 'acct-basics'; only seed newly added 'phys-mechanics'
    expect(updated.newlySeededSkills.map((s) => s.skillId)).toEqual(['phys-mechanics']);

    const diffOnly = diffProfileChanges(
      initial.learner,
      updated.profile,
      {
        ...updated.profile,
        displayName: updated.learner.displayName,
        learningPreferences: updated.profile.learningPreferences,
      },
      updated.profile.learningPreferences,
    );
    expect(diffOnly.changedFields).toEqual(['no_changes']);

    const seededDuplicateCheck = seedUnassessedSkillsForProfile({
      learnerId: initial.learner.id,
      selfReportedSkills: ['acct-basics', 'acct-basics'],
      existingLearnerSkills: verifiedExisting,
    });
    expect(seededDuplicateCheck).toEqual([]);
  });

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('persists profile, preferences, history, and unassessed seeds locally in IndexedDB and validates backups', async () => {
    const repo = new IndexedDBLearningRepository();
    await repo.initialize();

    const update = buildLearnerAndProfileUpdate({
      existingLearner: null,
      existingProfile: null,
      existingLearnerSkills: [],
      input: {
        displayName: 'Arjun Patel',
        educationalBackground: 'Class 12 PCM',
        academicLevel: 'high_school',
        interests: ['Mechanics', 'Electromagnetism'],
        careerAspirations: 'Prepare for physics olympiad & engineering entrance',
        selfReportedSkills: ['phys-math-methods'],
        targetSkills: ['phys-mechanics', 'phys-electromagnetism'],
        availableHoursPerDay: 3,
        studyDaysPerWeek: 6,
        preferredFormat: 'interactive_quizzes',
        preferredLanguage: 'English',
        targetCompletionDate: '2027-04-15',
        learningPreferences: {
          sessionLengthMinutes: 60,
          revisionFrequencyDays: 2,
          dailyReminderTime: '18:00',
        },
      },
      now: '2026-11-25T14:00:00Z',
    });

    await repo.saveLearnerAndProfile(update.learner, update.profile);
    await repo.upsertLearnerSkills(update.newlySeededSkills);
    await repo.saveSettings(createDefaultSettings('web'));
    await repo.close();

    const reopened = new IndexedDBLearningRepository();
    await reopened.initialize();
    const snapshot = await reopened.loadSnapshot();
    await reopened.close();
    expect(snapshot.learner?.displayName).toBe('Arjun Patel');
    expect(snapshot.profile?.learningPreferences.sessionLengthMinutes).toBe(60);
    expect(snapshot.profile?.history).toHaveLength(1);
    expect(snapshot.learnerSkills[0]?.status).toBe('unassessed');

    const backup = await exportSnapshotToBackup(snapshot, 'web');
    const validated = await validateAndParseImportBackup(JSON.stringify(backup));
    expect(validated.ok).toBe(true);
    if (validated.ok) {
      expect(validated.envelope.data.profile?.learningPreferences.revisionFrequencyDays).toBe(2);
    }
  });
});
