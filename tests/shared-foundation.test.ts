import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as sharedTypes from '@alc/shared-types';
import * as validation from '@alc/validation';
import * as designSystem from '@alc/design-system';
import * as skillGraph from '@alc/skill-graph';
import * as assessmentEngine from '@alc/assessment-engine';
import * as studyPlanner from '@alc/study-planner';
import * as progressEngine from '@alc/progress-engine';
import * as adaptiveEngine from '@alc/adaptive-engine';
import * as learningEngine from '@alc/learning-engine';
import * as resourceManagement from '@alc/resource-management';
import * as storage from '@alc/storage';
import * as aiContracts from '@alc/ai-contracts';
import * as aiAdapters from '@alc/ai-adapters';

const ROOT = path.resolve(__dirname, '..');

describe('Phase 05 Monorepo & Shared Foundation Hardening', () => {
  it('verifies all 13 shared workspace packages expose clean public exports', () => {
    expect(sharedTypes).toBeDefined();
    expect(typeof validation.parseBackupEnvelope).toBe('function');
    expect(designSystem.palette.bgPrimary).toBe('#080D1A');
    expect(typeof skillGraph.SkillGraph).toBe('function');
    expect(typeof assessmentEngine.evaluateAssessmentSubmission).toBe('function');
    expect(typeof studyPlanner.generateStudySchedule).toBe('function');
    expect(typeof progressEngine.computeProgressMetrics).toBe('function');
    expect(typeof adaptiveEngine.evaluateAdaptiveRules).toBe('function');
    expect(learningEngine.GOAL_TEMPLATES.length).toBeGreaterThanOrEqual(16);
    expect(resourceManagement.DIAGNOSTIC_QUESTIONS.length).toBe(10);
    expect(typeof storage.exportSnapshotToBackup).toBe('function');
    expect(typeof aiContracts.formatLlama32InstructPrompt).toBe('function');
    expect(typeof aiAdapters.LocalAIAdvisoryService).toBe('function');
  });

  it('validates SQLite migration plan monotonicity, foreign keys, and pending migration selection', () => {
    const check = storage.validateMigrationPlan(storage.SQLITE_MIGRATIONS);
    expect(check.valid).toBe(true);
    expect(storage.getPendingMigrations([], storage.SQLITE_MIGRATIONS).length).toBe(
      storage.SQLITE_MIGRATIONS.length,
    );
    expect(storage.getPendingMigrations([1], storage.SQLITE_MIGRATIONS).map((m) => m.version)).toEqual([2]);
    expect(storage.getPendingMigrations([1, 2], storage.SQLITE_MIGRATIONS)).toEqual([]);

    const badOrder = [
      { version: 2, statements: ['PRAGMA foreign_keys = ON;'] },
    ];
    expect(storage.validateMigrationPlan(badOrder).valid).toBe(false);
  });

  it('enforces strict BackupEnvelopeSchema, prototype pollution rejection, and log redaction', async () => {
    const snapshot: storage.LearningDatabaseSnapshot = {
      learner: {
        id: 'l1',
        displayName: 'Kavya',
        createdAt: '2026-11-25T00:00:00Z',
        updatedAt: '2026-11-25T00:00:00Z',
      },
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
      settings: storage.createDefaultSettings('android'),
    };

    const backup = await storage.exportSnapshotToBackup(snapshot, 'android');
    const serialized = JSON.stringify(backup);
    const verified = await storage.validateAndParseImportBackup(serialized);
    expect(verified.ok).toBe(true);

    // Rejects prototype-polluting JSON keys
    const polluted = serialized.replace('"displayName":"Kavya"', '"__proto__":{"polluted":true},"displayName":"Kavya"');
    const pollutedCheck = await storage.validateAndParseImportBackup(polluted);
    expect(pollutedCheck.ok).toBe(false);

    // Rejects invalid entity shapes (strict Zod schema instead of z.any())
    const invalidShape = JSON.stringify({
      ...backup,
      data: { ...backup.data, learner: { id: '' } },
    });
    expect(validation.parseBackupEnvelope(invalidShape).ok).toBe(false);

    // Redacts secrets safely from logs
    const redacted = validation.safeRedactForLog({
      hf_token: 'hf_secret_123',
      nested: { apiKey: 'xyz', safeField: 'ok' },
    });
    expect(redacted.hf_token).toBe('[REDACTED]');
    expect(redacted.nested.apiKey).toBe('[REDACTED]');
    expect(redacted.nested.safeField).toBe('ok');
  });

  it('verifies all 13 packages declare private, sideEffects=false, exports["."], and strict tsconfig inheritance', () => {
    const pkgDirs = fs.readdirSync(path.join(ROOT, 'packages'));
    expect(pkgDirs.length).toBe(13);
    for (const dir of pkgDirs) {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', dir, 'package.json'), 'utf8'));
      const ts = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', dir, 'tsconfig.json'), 'utf8'));
      expect(pkg.private).toBe(true);
      expect(pkg.sideEffects).toBe(false);
      expect(pkg.exports?.['.']?.types).toBe('./src/index.ts');
      expect(ts.extends).toBe('../../tsconfig.base.json');
    }
  });
});
