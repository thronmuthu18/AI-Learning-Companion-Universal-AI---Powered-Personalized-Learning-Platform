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
import { parseBackupEnvelope, validateBackupSize } from '@alc/validation';

export const CURRENT_SCHEMA_VERSION = 2;
export const APP_VERSION = '1.0.0';

export interface SqliteMigration {
  version: number;
  statements: string[];
}

export function validateMigrationPlan(migrations: SqliteMigration[]): { valid: boolean; error?: string } {
  if (migrations.length === 0) {
    return { valid: false, error: 'Migration list cannot be empty.' };
  }
  let expectedVersion = 1;
  for (const m of migrations) {
    if (m.version !== expectedVersion) {
      return {
        valid: false,
        error: `Non-sequential migration version ${m.version} (expected ${expectedVersion}).`,
      };
    }
    if (!m.statements.length) {
      return { valid: false, error: `Migration v${m.version} has zero SQL statements.` };
    }
    expectedVersion += 1;
  }
  if (!migrations[0]!.statements.some((s) => s.toUpperCase().includes('PRAGMA FOREIGN_KEYS = ON'))) {
    return { valid: false, error: 'Migration v1 must enable PRAGMA foreign_keys = ON.' };
  }
  return { valid: true };
}

export function getPendingMigrations(
  appliedVersions: number[],
  migrations: SqliteMigration[] = SQLITE_MIGRATIONS,
): SqliteMigration[] {
  const applied = new Set(appliedVersions);
  return migrations.filter((m) => !applied.has(m.version)).sort((a, b) => a.version - b.version);
}

/**
 * Versioned SQLite DDL migrations shared across Android & iOS native SQLite stores.
 */
export const SQLITE_MIGRATIONS: SqliteMigration[] = [
  {
    version: 1,
    statements: [
      `PRAGMA foreign_keys = ON;`,
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS learners (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS learner_profiles (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS learning_goals (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS learner_skills (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
        skill_id TEXT NOT NULL,
        demonstrated_competence INTEGER NOT NULL,
        assessment_count INTEGER NOT NULL DEFAULT 0,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_learner_skills_unique ON learner_skills(learner_id, skill_id);`,
      `CREATE TABLE IF NOT EXISTS assessment_attempts (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
        assessment_id TEXT NOT NULL,
        score_percent INTEGER NOT NULL,
        completed_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS assessment_answers (
        id TEXT PRIMARY KEY,
        attempt_id TEXT NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL,
        skill_id TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        payload_json TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS learning_paths (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
        goal_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS study_schedules (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
        path_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS study_sessions (
        id TEXT PRIMARY KEY,
        schedule_id TEXT NOT NULL REFERENCES study_schedules(id) ON DELETE CASCADE,
        learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
        date_iso TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(learner_id, date_iso);`,
      `CREATE TABLE IF NOT EXISTS progress_records (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
        date_iso TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS recommendations (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
        dismissed INTEGER NOT NULL DEFAULT 0,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
        quiz_id TEXT NOT NULL,
        skill_id TEXT NOT NULL,
        score_percent INTEGER NOT NULL,
        completed_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS user_resources (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL,
        origin TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS model_downloads (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        state TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS app_settings (
        id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
    ],
  },
  {
    version: 2,
    statements: [
      `CREATE INDEX IF NOT EXISTS idx_learning_goals_learner ON learning_goals(learner_id, is_active);`,
      `CREATE INDEX IF NOT EXISTS idx_assessment_attempts_learner ON assessment_attempts(learner_id, completed_at);`,
      `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_learner ON quiz_attempts(learner_id, skill_id);`,
      `CREATE INDEX IF NOT EXISTS idx_progress_records_date ON progress_records(learner_id, date_iso);`,
      `CREATE INDEX IF NOT EXISTS idx_recommendations_learner ON recommendations(learner_id, dismissed);`,
    ],
  },
];

export interface LearningDatabaseSnapshot {
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
  modelDownloads: ModelDownload[];
  settings: ApplicationSettings;
}

export interface StorageIntegrityReport {
  ok: boolean;
  schemaVersion: number;
  details: string[];
}

export interface LearningRepository {
  initialize(): Promise<void>;
  loadSnapshot(): Promise<LearningDatabaseSnapshot>;
  saveLearnerAndProfile(learner: Learner, profile: LearnerProfile | null): Promise<void>;
  saveGoal(goal: LearningGoal): Promise<void>;
  deleteGoal(goalId: string): Promise<void>;
  upsertLearnerSkills(skills: LearnerSkill[]): Promise<void>;
  saveAssessmentSubmission(attempt: AssessmentAttempt, answers: AssessmentAnswer[]): Promise<void>;
  saveLearningPath(path: LearningPath): Promise<void>;
  saveStudySchedule(schedule: StudySchedule): Promise<void>;
  updateStudySession(session: StudySession): Promise<void>;
  saveProgressRecord(record: ProgressRecord): Promise<void>;
  replaceRecommendations(learnerId: string, recommendations: Recommendation[]): Promise<void>;
  dismissRecommendation(recommendationId: string): Promise<void>;
  saveQuizAttempt(attempt: QuizAttempt): Promise<void>;
  saveUserResource(resource: LearningResource): Promise<void>;
  deleteUserResource(resourceId: string): Promise<void>;
  saveModelDownload(download: ModelDownload): Promise<void>;
  deleteModelDownload(downloadId: string): Promise<void>;
  saveSettings(settings: ApplicationSettings): Promise<void>;
  verifyIntegrity(): Promise<StorageIntegrityReport>;
  importBackup(envelope: BackupEnvelope): Promise<void>;
  clearAllData(): Promise<void>;
}

export function createDefaultSettings(platform: PlatformKind): ApplicationSettings {
  return {
    id: 'default',
    theme: 'dark_navy',
    offlineOnlyMode: false,
    requireWifiForModelDownload: true,
    privacyStrictLocalOnly: true,
    autoAdaptSchedule: true,
    activeModelId:
      platform === 'web'
        ? 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
        : 'llama-3.2-1b-instruct-xnnpack-q4',
    updatedAt: new Date().toISOString(),
  };
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function pureSha256Hex(bytes: Uint8Array): string {
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000) >>> 0, false);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i]! + w[i]!) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => v.toString(16).padStart(8, '0'))
    .join('');
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return pureSha256Hex(bytes);
}

function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => (item === undefined ? 'null' : canonicalJsonStringify(item))).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${sortedKeys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`).join(',')}}`;
}

export async function exportSnapshotToBackup(
  snapshot: LearningDatabaseSnapshot,
  sourcePlatform: PlatformKind,
): Promise<BackupEnvelope> {
  const data: BackupEnvelope['data'] = {
    learner: snapshot.learner,
    profile: snapshot.profile,
    goals: snapshot.goals,
    learnerSkills: snapshot.learnerSkills,
    assessmentAttempts: snapshot.assessmentAttempts,
    assessmentAnswers: snapshot.assessmentAnswers,
    learningPaths: snapshot.learningPaths,
    studySchedules: snapshot.studySchedules,
    studySessions: snapshot.studySessions,
    progressRecords: snapshot.progressRecords,
    recommendations: snapshot.recommendations,
    quizAttempts: snapshot.quizAttempts,
    userResources: snapshot.userResources,
    settings: snapshot.settings,
  };

  const canonical = canonicalJsonStringify(data);
  const checksumSha256 = await sha256Hex(canonical);

  return {
    metadata: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      sourcePlatform,
      checksumSha256,
      recordCounts: {
        goals: data.goals.length,
        learnerSkills: data.learnerSkills.length,
        assessmentAttempts: data.assessmentAttempts.length,
        learningPaths: data.learningPaths.length,
        studySessions: data.studySessions.length,
        quizAttempts: data.quizAttempts.length,
        userResources: data.userResources.length,
      },
    },
    data,
  };
}

export async function validateAndParseImportBackup(
  rawJson: string,
): Promise<{ ok: true; envelope: BackupEnvelope } | { ok: false; error: string }> {
  const byteSize = new TextEncoder().encode(rawJson).byteLength;
  const sizeCheck = validateBackupSize(byteSize);
  if (!sizeCheck.valid) {
    return { ok: false, error: sizeCheck.error ?? 'Invalid backup size' };
  }

  const parsed = parseBackupEnvelope(rawJson);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const computedHash = await sha256Hex(canonicalJsonStringify(parsed.value.data));
  if (computedHash !== parsed.value.metadata.checksumSha256) {
    return {
      ok: false,
      error: 'Backup SHA-256 checksum mismatch: file may be corrupted or modified.',
    };
  }

  if (parsed.value.metadata.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported backup schemaVersion ${parsed.value.metadata.schemaVersion} (max supported: ${CURRENT_SCHEMA_VERSION}).`,
    };
  }

  return { ok: true, envelope: parsed.value };
}
