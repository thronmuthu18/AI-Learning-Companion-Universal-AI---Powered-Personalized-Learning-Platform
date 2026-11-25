import * as SQLite from 'expo-sqlite';
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
  PlatformKind,
  ProgressRecord,
  QuizAttempt,
  Recommendation,
  StudySchedule,
  StudySession,
} from '@alc/shared-types';
import {
  createDefaultSettings,
  getPendingMigrations,
  type LearningDatabaseSnapshot,
  type LearningRepository,
  SQLITE_MIGRATIONS,
  type StorageIntegrityReport,
  validateMigrationPlan,
} from '@alc/storage';

const DB_FILENAME = 'ai_learning_companion.db';

const DATA_TABLES = [
  'recommendations',
  'progress_records',
  'study_sessions',
  'study_schedules',
  'learning_paths',
  'assessment_answers',
  'assessment_attempts',
  'quiz_attempts',
  'learner_skills',
  'learning_goals',
  'learner_profiles',
  'learners',
  'user_resources',
  'model_downloads',
] as const;

export class SQLiteLearningRepository implements LearningRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  constructor(private readonly platform: PlatformKind) {}

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) return this.db;
    this.db = await SQLite.openDatabaseAsync(DB_FILENAME);
    await this.db.execAsync('PRAGMA foreign_keys = ON;');
    return this.db;
  }

  async initialize(): Promise<void> {
    const planCheck = validateMigrationPlan(SQLITE_MIGRATIONS);
    if (!planCheck.valid) {
      throw new Error(`Invalid SQLite migration plan: ${planCheck.error}`);
    }
    const db = await this.getDb();
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);`,
    );
    const appliedRows = await db.getAllAsync<{ version: number }>(
      `SELECT version FROM schema_migrations`,
    );
    const pending = getPendingMigrations(
      appliedRows.map((r) => r.version),
      SQLITE_MIGRATIONS,
    );

    for (const migration of pending) {
      await db.withTransactionAsync(async () => {
        for (const stmt of migration.statements) {
          await db.execAsync(stmt);
        }
        await db.runAsync(
          `INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)`,
          migration.version,
          new Date().toISOString(),
        );
      });
    }

    const existingSettings = await db.getFirstAsync<{ payload_json: string }>(
      `SELECT payload_json FROM app_settings WHERE id = ?`,
      'default',
    );
    if (!existingSettings) {
      await this.saveSettings(createDefaultSettings(this.platform));
    }
  }

  async loadSnapshot(): Promise<LearningDatabaseSnapshot> {
    const db = await this.getDb();
    const parsePayloadRows = async <T>(table: string): Promise<T[]> => {
      const rows = await db.getAllAsync<{ payload_json: string }>(
        `SELECT payload_json FROM ${table}`,
      );
      return rows.map((r) => JSON.parse(r.payload_json) as T);
    };

    const learnerRow = await db.getFirstAsync<{
      id: string;
      display_name: string;
      created_at: string;
      updated_at: string;
    }>(`SELECT id, display_name, created_at, updated_at FROM learners LIMIT 1`);

    const learner: Learner | null = learnerRow
      ? {
          id: learnerRow.id,
          displayName: learnerRow.display_name,
          createdAt: learnerRow.created_at,
          updatedAt: learnerRow.updated_at,
        }
      : null;

    const profiles = await parsePayloadRows<LearnerProfile>('learner_profiles');
    const goals = await parsePayloadRows<LearningGoal>('learning_goals');
    const learnerSkills = await parsePayloadRows<LearnerSkill>('learner_skills');
    const assessmentAttempts = await parsePayloadRows<AssessmentAttempt>('assessment_attempts');
    const assessmentAnswers = await parsePayloadRows<AssessmentAnswer>('assessment_answers');
    const learningPaths = await parsePayloadRows<LearningPath>('learning_paths');
    const studySchedules = await parsePayloadRows<StudySchedule>('study_schedules');
    const studySessions = await parsePayloadRows<StudySession>('study_sessions');
    const progressRecords = await parsePayloadRows<ProgressRecord>('progress_records');
    const recommendations = await parsePayloadRows<Recommendation>('recommendations');
    const quizAttempts = await parsePayloadRows<QuizAttempt>('quiz_attempts');
    const userResources = await parsePayloadRows<LearningResource>('user_resources');
    const modelDownloads = await parsePayloadRows<ModelDownload>('model_downloads');
    const settingsRows = await parsePayloadRows<ApplicationSettings>('app_settings');

    return {
      learner,
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
      settings: settingsRows[0] ?? createDefaultSettings(this.platform),
    };
  }

  async saveLearnerAndProfile(learner: Learner, profile: LearnerProfile | null): Promise<void> {
    const db = await this.getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO learners (id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        learner.id,
        learner.displayName,
        learner.createdAt,
        learner.updatedAt,
      );
      if (profile) {
        await db.runAsync(
          `INSERT OR REPLACE INTO learner_profiles (id, learner_id, payload_json, updated_at) VALUES (?, ?, ?, ?)`,
          profile.id,
          profile.learnerId,
          JSON.stringify(profile),
          profile.updatedAt,
        );
      }
    });
  }

  async saveGoal(goal: LearningGoal): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO learning_goals (id, learner_id, category, is_active, payload_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      goal.id,
      goal.learnerId,
      goal.category,
      goal.isActive ? 1 : 0,
      JSON.stringify(goal),
      goal.updatedAt,
    );
  }

  async deleteGoal(goalId: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`DELETE FROM learning_goals WHERE id = ?`, goalId);
  }

  async upsertLearnerSkills(skills: LearnerSkill[]): Promise<void> {
    const db = await this.getDb();
    await db.withTransactionAsync(async () => {
      for (const s of skills) {
        await db.runAsync(
          `INSERT OR REPLACE INTO learner_skills (id, learner_id, skill_id, demonstrated_competence, assessment_count, payload_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          s.id,
          s.learnerId,
          s.skillId,
          s.demonstratedCompetence,
          s.assessmentCount,
          JSON.stringify(s),
          s.updatedAt,
        );
      }
    });
  }

  async saveAssessmentSubmission(
    attempt: AssessmentAttempt,
    answers: AssessmentAnswer[],
  ): Promise<void> {
    const db = await this.getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO assessment_attempts (id, learner_id, assessment_id, score_percent, completed_at, payload_json) VALUES (?, ?, ?, ?, ?, ?)`,
        attempt.id,
        attempt.learnerId,
        attempt.assessmentId,
        attempt.scorePercent,
        attempt.completedAt,
        JSON.stringify(attempt),
      );
      for (const a of answers) {
        await db.runAsync(
          `INSERT OR REPLACE INTO assessment_answers (id, attempt_id, question_id, skill_id, is_correct, payload_json) VALUES (?, ?, ?, ?, ?, ?)`,
          a.id,
          a.attemptId,
          a.questionId,
          a.skillId,
          a.isCorrect ? 1 : 0,
          JSON.stringify(a),
        );
      }
    });
  }

  async saveLearningPath(path: LearningPath): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO learning_paths (id, learner_id, goal_id, payload_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
      path.id,
      path.learnerId,
      path.goalId,
      JSON.stringify(path),
      path.updatedAt,
    );
  }

  async saveStudySchedule(schedule: StudySchedule): Promise<void> {
    const db = await this.getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO study_schedules (id, learner_id, path_id, payload_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
        schedule.id,
        schedule.learnerId,
        schedule.pathId,
        JSON.stringify(schedule),
        schedule.updatedAt,
      );
      await db.runAsync(`DELETE FROM study_sessions WHERE schedule_id = ?`, schedule.id);
      for (const s of schedule.sessions) {
        await db.runAsync(
          `INSERT OR REPLACE INTO study_sessions (id, schedule_id, learner_id, date_iso, status, payload_json) VALUES (?, ?, ?, ?, ?, ?)`,
          s.id,
          s.scheduleId,
          s.learnerId,
          s.dateISO,
          s.status,
          JSON.stringify(s),
        );
      }
    });
  }

  async updateStudySession(session: StudySession): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO study_sessions (id, schedule_id, learner_id, date_iso, status, payload_json) VALUES (?, ?, ?, ?, ?, ?)`,
      session.id,
      session.scheduleId,
      session.learnerId,
      session.dateISO,
      session.status,
      JSON.stringify(session),
    );
  }

  async saveProgressRecord(record: ProgressRecord): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO progress_records (id, learner_id, date_iso, payload_json) VALUES (?, ?, ?, ?)`,
      record.id,
      record.learnerId,
      record.dateISO,
      JSON.stringify(record),
    );
  }

  async replaceRecommendations(
    learnerId: string,
    recommendations: Recommendation[],
  ): Promise<void> {
    const db = await this.getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM recommendations WHERE learner_id = ?`, learnerId);
      for (const r of recommendations) {
        await db.runAsync(
          `INSERT OR REPLACE INTO recommendations (id, learner_id, dismissed, payload_json, created_at) VALUES (?, ?, ?, ?, ?)`,
          r.id,
          r.learnerId,
          r.dismissed ? 1 : 0,
          JSON.stringify(r),
          r.createdAt,
        );
      }
    });
  }

  async dismissRecommendation(recommendationId: string): Promise<void> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ payload_json: string }>(
      `SELECT payload_json FROM recommendations WHERE id = ?`,
      recommendationId,
    );
    if (!row) return;
    const rec = JSON.parse(row.payload_json) as Recommendation;
    const updated: Recommendation = { ...rec, dismissed: true };
    await db.runAsync(
      `UPDATE recommendations SET dismissed = 1, payload_json = ? WHERE id = ?`,
      JSON.stringify(updated),
      recommendationId,
    );
  }

  async saveQuizAttempt(attempt: QuizAttempt): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO quiz_attempts (id, learner_id, quiz_id, skill_id, score_percent, completed_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      attempt.id,
      attempt.learnerId,
      attempt.quizId,
      attempt.skillId,
      attempt.scorePercent,
      attempt.completedAt,
      JSON.stringify(attempt),
    );
  }

  async saveUserResource(resource: LearningResource): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO user_resources (id, skill_id, origin, payload_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
      resource.id,
      resource.skillId,
      resource.origin,
      JSON.stringify(resource),
      resource.updatedAt,
    );
  }

  async deleteUserResource(resourceId: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`DELETE FROM user_resources WHERE id = ?`, resourceId);
  }

  async saveModelDownload(download: ModelDownload): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO model_downloads (id, model_id, platform, state, payload_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      download.id,
      download.modelId,
      download.platform,
      download.state,
      JSON.stringify(download),
      download.updatedAt,
    );
  }

  async deleteModelDownload(downloadId: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`DELETE FROM model_downloads WHERE id = ?`, downloadId);
  }

  async saveSettings(settings: ApplicationSettings): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO app_settings (id, payload_json, updated_at) VALUES (?, ?, ?)`,
      settings.id,
      JSON.stringify(settings),
      settings.updatedAt,
    );
  }

  async verifyIntegrity(): Promise<StorageIntegrityReport> {
    const db = await this.getDb();
    const integrity = await db.getFirstAsync<{ integrity_check: string }>(
      `PRAGMA integrity_check;`,
    );
    const fkViolations = await db.getAllAsync<{ table: string }>(`PRAGMA foreign_key_check;`);
    const verRow = await db.getFirstAsync<{ max_ver: number | null }>(
      `SELECT MAX(version) as max_ver FROM schema_migrations`,
    );
    const ok = integrity?.integrity_check === 'ok' && fkViolations.length === 0;
    return {
      ok,
      schemaVersion: verRow?.max_ver ?? 0,
      details: [
        `integrity_check=${integrity?.integrity_check ?? 'unknown'}`,
        `foreign_key_violations=${fkViolations.length}`,
      ],
    };
  }

  /**
   * Atomic backup restore: executes inside a single SQLite transaction so any failure
   * automatically rolls back without losing existing learner data.
   */
  async importBackup(envelope: BackupEnvelope): Promise<void> {
    const db = await this.getDb();
    await db.withTransactionAsync(async () => {
      for (const table of DATA_TABLES) {
        await db.execAsync(`DELETE FROM ${table};`);
      }
      if (envelope.data.learner) {
        const l = envelope.data.learner;
        await db.runAsync(
          `INSERT OR REPLACE INTO learners (id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          l.id,
          l.displayName,
          l.createdAt,
          l.updatedAt,
        );
      }
      if (envelope.data.profile) {
        const p = envelope.data.profile;
        await db.runAsync(
          `INSERT OR REPLACE INTO learner_profiles (id, learner_id, payload_json, updated_at) VALUES (?, ?, ?, ?)`,
          p.id,
          p.learnerId,
          JSON.stringify(p),
          p.updatedAt,
        );
      }
      for (const g of envelope.data.goals) {
        await db.runAsync(
          `INSERT OR REPLACE INTO learning_goals (id, learner_id, category, is_active, payload_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          g.id,
          g.learnerId,
          g.category,
          g.isActive ? 1 : 0,
          JSON.stringify(g),
          g.updatedAt,
        );
      }
      for (const s of envelope.data.learnerSkills) {
        await db.runAsync(
          `INSERT OR REPLACE INTO learner_skills (id, learner_id, skill_id, demonstrated_competence, assessment_count, payload_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          s.id,
          s.learnerId,
          s.skillId,
          s.demonstratedCompetence,
          s.assessmentCount,
          JSON.stringify(s),
          s.updatedAt,
        );
      }
      for (const a of envelope.data.assessmentAttempts) {
        await db.runAsync(
          `INSERT OR REPLACE INTO assessment_attempts (id, learner_id, assessment_id, score_percent, completed_at, payload_json) VALUES (?, ?, ?, ?, ?, ?)`,
          a.id,
          a.learnerId,
          a.assessmentId,
          a.scorePercent,
          a.completedAt,
          JSON.stringify(a),
        );
      }
      for (const ans of envelope.data.assessmentAnswers) {
        await db.runAsync(
          `INSERT OR REPLACE INTO assessment_answers (id, attempt_id, question_id, skill_id, is_correct, payload_json) VALUES (?, ?, ?, ?, ?, ?)`,
          ans.id,
          ans.attemptId,
          ans.questionId,
          ans.skillId,
          ans.isCorrect ? 1 : 0,
          JSON.stringify(ans),
        );
      }
      for (const lp of envelope.data.learningPaths) {
        await db.runAsync(
          `INSERT OR REPLACE INTO learning_paths (id, learner_id, goal_id, payload_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
          lp.id,
          lp.learnerId,
          lp.goalId,
          JSON.stringify(lp),
          lp.updatedAt,
        );
      }
      for (const sc of envelope.data.studySchedules) {
        await db.runAsync(
          `INSERT OR REPLACE INTO study_schedules (id, learner_id, path_id, payload_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
          sc.id,
          sc.learnerId,
          sc.pathId,
          JSON.stringify(sc),
          sc.updatedAt,
        );
      }
      for (const ss of envelope.data.studySessions) {
        await db.runAsync(
          `INSERT OR REPLACE INTO study_sessions (id, schedule_id, learner_id, date_iso, status, payload_json) VALUES (?, ?, ?, ?, ?, ?)`,
          ss.id,
          ss.scheduleId,
          ss.learnerId,
          ss.dateISO,
          ss.status,
          JSON.stringify(ss),
        );
      }
      for (const pr of envelope.data.progressRecords) {
        await db.runAsync(
          `INSERT OR REPLACE INTO progress_records (id, learner_id, date_iso, payload_json) VALUES (?, ?, ?, ?)`,
          pr.id,
          pr.learnerId,
          pr.dateISO,
          JSON.stringify(pr),
        );
      }
      for (const rec of envelope.data.recommendations) {
        await db.runAsync(
          `INSERT OR REPLACE INTO recommendations (id, learner_id, dismissed, payload_json, created_at) VALUES (?, ?, ?, ?, ?)`,
          rec.id,
          rec.learnerId,
          rec.dismissed ? 1 : 0,
          JSON.stringify(rec),
          rec.createdAt,
        );
      }
      for (const qa of envelope.data.quizAttempts) {
        await db.runAsync(
          `INSERT OR REPLACE INTO quiz_attempts (id, learner_id, quiz_id, skill_id, score_percent, completed_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          qa.id,
          qa.learnerId,
          qa.quizId,
          qa.skillId,
          qa.scorePercent,
          qa.completedAt,
          JSON.stringify(qa),
        );
      }
      for (const ur of envelope.data.userResources) {
        await db.runAsync(
          `INSERT OR REPLACE INTO user_resources (id, skill_id, origin, payload_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
          ur.id,
          ur.skillId,
          ur.origin,
          JSON.stringify(ur),
          ur.updatedAt,
        );
      }
      const settings = envelope.data.settings;
      await db.runAsync(
        `INSERT OR REPLACE INTO app_settings (id, payload_json, updated_at) VALUES (?, ?, ?)`,
        settings.id,
        JSON.stringify(settings),
        settings.updatedAt,
      );
    });
  }

  async clearAllData(): Promise<void> {
    const db = await this.getDb();
    await db.withTransactionAsync(async () => {
      for (const t of DATA_TABLES) {
        await db.execAsync(`DELETE FROM ${t};`);
      }
    });
    await this.saveSettings(createDefaultSettings(this.platform));
  }
}
