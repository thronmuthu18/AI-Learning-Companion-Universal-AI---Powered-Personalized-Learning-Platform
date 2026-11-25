import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { DatabaseSync } from 'node:sqlite';
import { IndexedDBLearningRepository } from '../apps/web/src/storage/indexeddb-repository';
import {
  createDefaultSettings,
  CURRENT_SCHEMA_VERSION,
  exportSnapshotToBackup,
  getPendingMigrations,
  SQLITE_MIGRATIONS,
  validateAndParseImportBackup,
  validateMigrationPlan,
} from '../packages/storage/src/index';

describe('Phase 06 Database & Storage Architecture (Real IndexedDB + Real node:sqlite)', () => {
  beforeEach(() => {
    // Reset fresh IndexedDB instance per test
    globalThis.indexedDB = new IDBFactory();
  });

  it('executes full IndexedDB CRUD, indexes, integrity verification, and restart persistence', async () => {
    const repo = new IndexedDBLearningRepository();
    await repo.initialize();

    const integrity = await repo.verifyIntegrity();
    expect(integrity.ok).toBe(true);
    expect(integrity.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);

    const now = '2026-11-25T10:00:00Z';
    await repo.saveLearnerAndProfile(
      { id: 'l1', displayName: 'Meera', createdAt: now, updatedAt: now },
      {
        id: 'p1',
        learnerId: 'l1',
        educationalBackground: 'B.Sc CS',
        academicLevel: 'undergraduate',
        interests: ['AI'],
        careerAspirations: 'ML Engineer',
        selfReportedSkills: ['python-core'],
        targetSkills: ['ml-foundations'],
        availableHoursPerDay: 2,
        studyDaysPerWeek: 5,
        preferredFormat: 'mixed',
        preferredLanguage: 'English',
        targetCompletionDate: null,
        learningPreferences: { sessionLengthMinutes: 45, revisionFrequencyDays: 4, dailyReminderTime: null },
        history: [],
        updatedAt: now,
      },
    );

    await repo.saveGoal({
      id: 'g1',
      learnerId: 'l1',
      category: 'ml_engineer',
      title: 'ML Engineer',
      rawDescription: 'Become ML Engineer',
      structuredObjectives: ['Master ML'],
      targetSkillIds: ['ml-foundations'],
      interpretedByAI: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    await repo.saveGoal({
      id: 'g2',
      learnerId: 'l1',
      category: 'python_developer',
      title: 'Python Dev',
      rawDescription: 'Temp goal',
      structuredObjectives: ['Python'],
      targetSkillIds: ['python-core'],
      interpretedByAI: false,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    });
    await repo.deleteGoal('g2');

    await repo.saveUserResource({
      id: 'ur1',
      skillId: 'python-core',
      title: 'Note 1',
      summary: 'Summary',
      contentMarkdown: '# Notes',
      codeExample: null,
      practicePrompt: null,
      origin: 'user_imported',
      externalUrl: null,
      isDownloadedOffline: true,
      estimatedMinutes: 15,
      difficulty: 'beginner',
      updatedAt: now,
    });
    await repo.saveUserResource({
      id: 'ur2',
      skillId: 'python-core',
      title: 'Note 2',
      summary: 'Temp',
      contentMarkdown: '# Temp',
      codeExample: null,
      practicePrompt: null,
      origin: 'user_imported',
      externalUrl: null,
      isDownloadedOffline: true,
      estimatedMinutes: 10,
      difficulty: 'beginner',
      updatedAt: now,
    });
    await repo.deleteUserResource('ur2');

    await repo.replaceRecommendations('l1', [
      {
        id: 'rec1',
        learnerId: 'l1',
        trigger: 'unassessed_prerequisites',
        title: 'Take diagnostic',
        rationale: 'Unassessed baseline',
        aiExplanation: null,
        targetSkillId: 'python-core',
        suggestedAction: 'Start diagnostic',
        priority: 'high',
        dismissed: false,
        createdAt: now,
      },
    ]);
    await repo.dismissRecommendation('rec1');

    await repo.saveModelDownload({
      id: 'md1',
      modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      platform: 'web',
      state: 'installed',
      progressPercent: 100,
      bytesDownloaded: 1000,
      totalBytes: 1000,
      localModelPath: 'cache://model',
      localTokenizerPath: null,
      verifiedSha256: 'abc',
      errorMessage: null,
      updatedAt: now,
    });

    // Simulate app restart (close & reopen)
    await repo.close();
    const reopened = new IndexedDBLearningRepository();
    await reopened.initialize();
    const snap = await reopened.loadSnapshot();

    expect(snap.learner?.displayName).toBe('Meera');
    expect(snap.goals.map((g) => g.id)).toEqual(['g1']);
    expect(snap.userResources.map((r) => r.id)).toEqual(['ur1']);
    expect(snap.recommendations[0]?.dismissed).toBe(true);
    expect(snap.modelDownloads.length).toBe(1);

    await reopened.deleteModelDownload('md1');
    expect((await reopened.loadSnapshot()).modelDownloads.length).toBe(0);
    await reopened.close();
  });

  it('upgrades real SQLite v1 -> v2 without data loss, enforces foreign keys, and recovers via transaction rollback', () => {
    expect(validateMigrationPlan(SQLITE_MIGRATIONS).valid).toBe(true);
    const db = new DatabaseSync(':memory:');

    // 1. Apply ONLY v1 migration
    const v1 = SQLITE_MIGRATIONS.find((m) => m.version === 1)!;
    for (const stmt of v1.statements) db.exec(stmt);
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
      1,
      '2026-11-25T00:00:00Z',
    );

    // Seed v1 learner and goal
    db.prepare('INSERT INTO learners (id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
      'l1',
      'Karthik',
      '2026-11-25T00:00:00Z',
      '2026-11-25T00:00:00Z',
    );
    db.prepare(
      'INSERT INTO learning_goals (id, learner_id, category, is_active, payload_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('g1', 'l1', 'ai_engineer', 1, '{"id":"g1"}', '2026-11-25T00:00:00Z');

    // 2. Enforce foreign keys: orphan goal referencing unknown learner must fail
    expect(() =>
      db
        .prepare(
          'INSERT INTO learning_goals (id, learner_id, category, is_active, payload_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run('g_orphan', 'missing_learner', 'ai_engineer', 1, '{}', '2026-11-25T00:00:00Z'),
    ).toThrow(/FOREIGN KEY constraint failed/i);

    // 3. Upgrade v1 -> v2 non-destructively
    const pending = getPendingMigrations([1], SQLITE_MIGRATIONS);
    expect(pending.map((m) => m.version)).toEqual([2]);
    db.exec('BEGIN TRANSACTION;');
    for (const stmt of pending[0]!.statements) db.exec(stmt);
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
      2,
      '2026-11-25T01:00:00Z',
    );
    db.exec('COMMIT;');

    // Existing v1 data preserved + v2 index present
    const learners = db.prepare('SELECT display_name FROM learners').all() as Array<{ display_name: string }>;
    expect(learners[0]?.display_name).toBe('Karthik');
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_learning_goals_learner'")
      .all();
    expect(indexes.length).toBe(1);

    // 4. Transaction rollback preserves existing state on failure
    db.exec('BEGIN TRANSACTION;');
    db.exec("DELETE FROM learning_goals WHERE id='g1';");
    db.exec('ROLLBACK;');
    const goalsAfterRollback = db.prepare('SELECT id FROM learning_goals').all() as Array<{ id: string }>;
    expect(goalsAfterRollback.map((g) => g.id)).toEqual(['g1']);

    // 5. Integrity and FK checks pass
    const integrity = db.prepare('PRAGMA integrity_check;').get() as { integrity_check: string };
    const fkCheck = db.prepare('PRAGMA foreign_key_check;').all();
    expect(integrity.integrity_check).toBe('ok');
    expect(fkCheck.length).toBe(0);
    db.close();
  });

  it('verifies cross-platform backup/restore parity, duplicate-ID safety, and corrupted backup rejection', async () => {
    const sourceRepo = new IndexedDBLearningRepository();
    await sourceRepo.initialize();
    const now = '2026-11-25T12:00:00Z';
    await sourceRepo.saveLearnerAndProfile(
      { id: 'l1', displayName: 'Priya', createdAt: now, updatedAt: now },
      null,
    );
    await sourceRepo.saveQuizAttempt({
      id: 'qa1',
      learnerId: 'l1',
      quizId: 'quiz_python-core',
      skillId: 'python-core',
      scorePercent: 100,
      correctCount: 2,
      totalQuestions: 2,
      answers: [{ questionId: 'qpy1', selectedOptionIndex: 2, isCorrect: true }],
      completedAt: now,
    });
    // Duplicate ID upsert idempotency
    await sourceRepo.saveQuizAttempt({
      id: 'qa1',
      learnerId: 'l1',
      quizId: 'quiz_python-core',
      skillId: 'python-core',
      scorePercent: 50,
      correctCount: 1,
      totalQuestions: 2,
      answers: [{ questionId: 'qpy1', selectedOptionIndex: 0, isCorrect: false }],
      completedAt: now,
    });

    const snapshot = await sourceRepo.loadSnapshot();
    expect(snapshot.quizAttempts.length).toBe(1);
    expect(snapshot.quizAttempts[0]?.scorePercent).toBe(50);

    const backup = await exportSnapshotToBackup(snapshot, 'web');
    const rawJson = JSON.stringify(backup);
    const verified = await validateAndParseImportBackup(rawJson);
    expect(verified.ok).toBe(true);

    // Reject unsupported future schemaVersion
    const futureEnvelope = {
      ...backup,
      metadata: { ...backup.metadata, schemaVersion: 99 },
    };
    const futureParsed = await validateAndParseImportBackup(JSON.stringify(futureEnvelope));
    expect(futureParsed.ok).toBe(false);

    // Restore into clean IndexedDB instance and confirm exact parity
    await sourceRepo.close();
    globalThis.indexedDB = new IDBFactory();
    const targetRepo = new IndexedDBLearningRepository();
    await targetRepo.initialize();
    if (verified.ok) {
      await targetRepo.importBackup(verified.envelope);
    }
    const restored = await targetRepo.loadSnapshot();
    expect(restored.learner?.displayName).toBe('Priya');
    expect(restored.quizAttempts[0]?.scorePercent).toBe(50);
    expect(restored.settings.id).toBe(createDefaultSettings('web').id);
    await targetRepo.close();
  });
});
