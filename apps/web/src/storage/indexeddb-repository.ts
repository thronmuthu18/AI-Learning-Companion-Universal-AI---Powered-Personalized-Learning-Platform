import { openDB, type IDBPDatabase } from 'idb';
import type {
  ApplicationSettings,
  AssessmentAnswer,
  AssessmentAttempt,
  BackupEnvelope,
  Learner,
  LearnerProfile,
  LearnerSkill,
  LearningGoal,
  LearningPath,
  LearningResource,
  ModelDownload,
  ProgressRecord,
  QuizAttempt,
  Recommendation,
  StudySchedule,
  StudySession,
} from '@alc/shared-types';
import {
  createDefaultSettings,
  CURRENT_SCHEMA_VERSION,
  type LearningDatabaseSnapshot,
  type LearningRepository,
  type StorageIntegrityReport,
} from '@alc/storage';

const DB_NAME = 'ai_learning_companion_db';
const DB_VERSION = CURRENT_SCHEMA_VERSION;

const STORES = [
  'learners',
  'learner_profiles',
  'learning_goals',
  'learner_skills',
  'assessment_attempts',
  'assessment_answers',
  'learning_paths',
  'study_schedules',
  'study_sessions',
  'progress_records',
  'recommendations',
  'quiz_attempts',
  'user_resources',
  'model_downloads',
  'app_settings',
] as const;

const STORE_INDEXES: Record<string, Array<{ name: string; keyPath: string }>> = {
  learning_goals: [{ name: 'by_learner', keyPath: 'learnerId' }],
  learner_skills: [{ name: 'by_skill', keyPath: 'skillId' }],
  assessment_attempts: [{ name: 'by_learner', keyPath: 'learnerId' }],
  assessment_answers: [{ name: 'by_attempt', keyPath: 'attemptId' }],
  learning_paths: [{ name: 'by_goal', keyPath: 'goalId' }],
  study_sessions: [
    { name: 'by_schedule', keyPath: 'scheduleId' },
    { name: 'by_date', keyPath: 'dateISO' },
  ],
  progress_records: [{ name: 'by_date', keyPath: 'dateISO' }],
  recommendations: [{ name: 'by_learner', keyPath: 'learnerId' }],
  quiz_attempts: [{ name: 'by_skill', keyPath: 'skillId' }],
  user_resources: [{ name: 'by_skill', keyPath: 'skillId' }],
};

export class IndexedDBLearningRepository implements LearningRepository {
  private db: IDBPDatabase | null = null;

  private async getDb(): Promise<IDBPDatabase> {
    if (this.db) return this.db;
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, tx) {
        for (const storeName of STORES) {
          const store = db.objectStoreNames.contains(storeName)
            ? tx.objectStore(storeName)
            : db.createObjectStore(storeName, { keyPath: 'id' });
          for (const idx of STORE_INDEXES[storeName] ?? []) {
            if (!store.indexNames.contains(idx.name)) {
              store.createIndex(idx.name, idx.keyPath, { unique: false });
            }
          }
        }
      },
    });
    return this.db;
  }

  async initialize(): Promise<void> {
    const db = await this.getDb();
    const existingSettings = await db.get('app_settings', 'default');
    if (!existingSettings) {
      await db.put('app_settings', createDefaultSettings('web'));
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async loadSnapshot(): Promise<LearningDatabaseSnapshot> {
    const db = await this.getDb();
    const [
      learners,
      profiles,
      goals,
      learnerSkills,
      assessmentAttempts,
      assessmentAnswers,
      learningPaths,
      studySchedules,
      studySessions,
      progressRecords,
      recommendations,
      quizAttempts,
      userResources,
      modelDownloads,
      settingsRow,
    ] = await Promise.all([
      db.getAll('learners') as Promise<Learner[]>,
      db.getAll('learner_profiles') as Promise<LearnerProfile[]>,
      db.getAll('learning_goals') as Promise<LearningGoal[]>,
      db.getAll('learner_skills') as Promise<LearnerSkill[]>,
      db.getAll('assessment_attempts') as Promise<AssessmentAttempt[]>,
      db.getAll('assessment_answers') as Promise<AssessmentAnswer[]>,
      db.getAll('learning_paths') as Promise<LearningPath[]>,
      db.getAll('study_schedules') as Promise<StudySchedule[]>,
      db.getAll('study_sessions') as Promise<StudySession[]>,
      db.getAll('progress_records') as Promise<ProgressRecord[]>,
      db.getAll('recommendations') as Promise<Recommendation[]>,
      db.getAll('quiz_attempts') as Promise<QuizAttempt[]>,
      db.getAll('user_resources') as Promise<LearningResource[]>,
      db.getAll('model_downloads') as Promise<ModelDownload[]>,
      db.get('app_settings', 'default') as Promise<ApplicationSettings | undefined>,
    ]);

    return {
      learner: learners[0] ?? null,
      profile: profiles[0] ?? null,
      goals,
      learnerSkills,
      assessmentAttempts,
      assessmentAnswers,
      learningPaths,
      studySchedules,
      studySessions,
      progressRecords,
      recommendations,
      quizAttempts,
      userResources,
      modelDownloads,
      settings: settingsRow ?? createDefaultSettings('web'),
    };
  }

  async saveLearnerAndProfile(learner: Learner, profile: LearnerProfile | null): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(['learners', 'learner_profiles'], 'readwrite');
    await tx.objectStore('learners').put(learner);
    if (profile) {
      await tx.objectStore('learner_profiles').put(profile);
    }
    await tx.done;
  }

  async saveGoal(goal: LearningGoal): Promise<void> {
    const db = await this.getDb();
    await db.put('learning_goals', goal);
  }

  async deleteGoal(goalId: string): Promise<void> {
    const db = await this.getDb();
    await db.delete('learning_goals', goalId);
  }

  async upsertLearnerSkills(skills: LearnerSkill[]): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction('learner_skills', 'readwrite');
    for (const s of skills) {
      await tx.store.put(s);
    }
    await tx.done;
  }

  async saveAssessmentSubmission(
    attempt: AssessmentAttempt,
    answers: AssessmentAnswer[],
  ): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(['assessment_attempts', 'assessment_answers'], 'readwrite');
    await tx.objectStore('assessment_attempts').put(attempt);
    const ansStore = tx.objectStore('assessment_answers');
    for (const a of answers) {
      await ansStore.put(a);
    }
    await tx.done;
  }

  async saveLearningPath(path: LearningPath): Promise<void> {
    const db = await this.getDb();
    await db.put('learning_paths', path);
  }

  async saveStudySchedule(schedule: StudySchedule): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(['study_schedules', 'study_sessions'], 'readwrite');
    await tx.objectStore('study_schedules').put(schedule);
    const sessionStore = tx.objectStore('study_sessions');
    const existing = (await sessionStore.getAll()) as StudySession[];
    for (const old of existing) {
      if (old.scheduleId === schedule.id) {
        await sessionStore.delete(old.id);
      }
    }
    for (const s of schedule.sessions) {
      await sessionStore.put(s);
    }
    await tx.done;
  }

  async updateStudySession(session: StudySession): Promise<void> {
    const db = await this.getDb();
    await db.put('study_sessions', session);
  }

  async saveProgressRecord(record: ProgressRecord): Promise<void> {
    const db = await this.getDb();
    await db.put('progress_records', record);
  }

  async replaceRecommendations(
    learnerId: string,
    recommendations: Recommendation[],
  ): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction('recommendations', 'readwrite');
    const existing = (await tx.store.getAll()) as Recommendation[];
    for (const rec of existing) {
      if (rec.learnerId === learnerId) {
        await tx.store.delete(rec.id);
      }
    }
    for (const r of recommendations) {
      await tx.store.put(r);
    }
    await tx.done;
  }

  async dismissRecommendation(recommendationId: string): Promise<void> {
    const db = await this.getDb();
    const rec = (await db.get('recommendations', recommendationId)) as Recommendation | undefined;
    if (rec) {
      await db.put('recommendations', { ...rec, dismissed: true });
    }
  }

  async saveQuizAttempt(attempt: QuizAttempt): Promise<void> {
    const db = await this.getDb();
    await db.put('quiz_attempts', attempt);
  }

  async saveUserResource(resource: LearningResource): Promise<void> {
    const db = await this.getDb();
    await db.put('user_resources', resource);
  }

  async deleteUserResource(resourceId: string): Promise<void> {
    const db = await this.getDb();
    await db.delete('user_resources', resourceId);
  }

  async saveModelDownload(download: ModelDownload): Promise<void> {
    const db = await this.getDb();
    await db.put('model_downloads', download);
  }

  async deleteModelDownload(downloadId: string): Promise<void> {
    const db = await this.getDb();
    await db.delete('model_downloads', downloadId);
  }

  async saveSettings(settings: ApplicationSettings): Promise<void> {
    const db = await this.getDb();
    await db.put('app_settings', settings);
  }

  async verifyIntegrity(): Promise<StorageIntegrityReport> {
    const db = await this.getDb();
    const missingStores = STORES.filter((s) => !db.objectStoreNames.contains(s));
    return {
      ok: missingStores.length === 0,
      schemaVersion: db.version,
      details:
        missingStores.length === 0
          ? [`IndexedDB v${db.version}: all ${STORES.length} object stores verified.`]
          : [`Missing object stores: ${missingStores.join(', ')}`],
    };
  }

  async importBackup(envelope: BackupEnvelope): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction([...STORES], 'readwrite');
    try {
      for (const s of STORES) {
        await tx.objectStore(s).clear();
      }
      if (envelope.data.learner) await tx.objectStore('learners').put(envelope.data.learner);
      if (envelope.data.profile) await tx.objectStore('learner_profiles').put(envelope.data.profile);
      for (const g of envelope.data.goals) await tx.objectStore('learning_goals').put(g);
      for (const ls of envelope.data.learnerSkills) await tx.objectStore('learner_skills').put(ls);
      for (const a of envelope.data.assessmentAttempts)
        await tx.objectStore('assessment_attempts').put(a);
      for (const ans of envelope.data.assessmentAnswers)
        await tx.objectStore('assessment_answers').put(ans);
      for (const p of envelope.data.learningPaths) await tx.objectStore('learning_paths').put(p);
      for (const sc of envelope.data.studySchedules) await tx.objectStore('study_schedules').put(sc);
      for (const ss of envelope.data.studySessions) await tx.objectStore('study_sessions').put(ss);
      for (const pr of envelope.data.progressRecords) await tx.objectStore('progress_records').put(pr);
      for (const rec of envelope.data.recommendations) await tx.objectStore('recommendations').put(rec);
      for (const qa of envelope.data.quizAttempts) await tx.objectStore('quiz_attempts').put(qa);
      for (const ur of envelope.data.userResources) await tx.objectStore('user_resources').put(ur);
      await tx.objectStore('app_settings').put(envelope.data.settings);
      await tx.done;
    } catch (err) {
      try {
        tx.abort();
      } catch {
        // Transaction already aborted
      }
      throw err;
    }
  }

  async clearAllData(): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction([...STORES], 'readwrite');
    for (const s of STORES) {
      await tx.objectStore(s).clear();
    }
    await tx.objectStore('app_settings').put(createDefaultSettings('web'));
    await tx.done;
  }
}
