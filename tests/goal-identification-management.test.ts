import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLearningGoal,
  interpretGoalDeterministically,
  mergeLlamaGoalInterpretation,
  prioritizeAndAllocateGoals,
  setGoalPriority,
  transitionGoalStatus,
  updateLearningGoal,
  validateLearningGoalInput,
} from '@alc/learning-engine';
import { LocalAIAdvisoryService } from '@alc/ai-adapters';
import type { LocalAIProvider } from '@alc/ai-contracts';
import type { LearnerProfile } from '@alc/shared-types';
import { createDefaultSettings, exportSnapshotToBackup, validateAndParseImportBackup } from '@alc/storage';
import { IndexedDBLearningRepository } from '../apps/web/src/storage/indexeddb-repository';

const baseProfile: LearnerProfile = {
  id: 'prof_g9',
  learnerId: 'u_g9',
  educationalBackground: 'Undergraduate',
  academicLevel: 'undergraduate',
  interests: ['Physics', 'Accounting', 'Engineering'],
  careerAspirations: 'Multi-disciplinary mastery',
  selfReportedSkills: [],
  targetSkills: [],
  availableHoursPerDay: 2,
  studyDaysPerWeek: 5, // 10 hours / week capacity
  preferredFormat: 'mixed',
  preferredLanguage: 'English',
  targetCompletionDate: null,
  learningPreferences: {
    sessionLengthMinutes: 45,
    revisionFrequencyDays: 4,
    dailyReminderTime: '19:00',
  },
  history: [],
  updatedAt: '2026-11-25T00:00:00Z',
};

describe('Phase 09 — Universal Goal Identification & Management', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('interprets natural-language goals deterministically across 6 unrelated domains without defaulting to Full Stack', () => {
    const cases = [
      { prompt: 'Learn Python programming and algorithms', expectedDomainId: 'dom_programming' },
      { prompt: 'Prepare for GATE ECE signals systems and network theory', expectedDomainId: 'dom_ece' },
      { prompt: 'Learn Business Accounting double entry bookkeeping and financial statements', expectedDomainId: 'dom_accounting' },
      { prompt: 'Study Physics classical mechanics and electromagnetism', expectedDomainId: 'dom_physics_chem' },
      { prompt: 'Prepare for UPSC competitive exam quantitative aptitude and mock strategy', expectedDomainId: 'dom_competitive_exams' },
      { prompt: 'Learn Graphic Design typography and visual layout', expectedDomainId: 'dom_design' },
    ];

    for (const c of cases) {
      const interpreted = interpretGoalDeterministically({
        rawGoalText: c.prompt,
        profile: baseProfile,
        todayISO: '2026-11-25',
      });
      expect(interpreted.interpretationSource).toBe('deterministic_fallback');
      expect(interpreted.domainId).toBe(c.expectedDomainId);
      expect(interpreted.estimatedLearningScope.weeklyCommitmentHours).toBe(10);
    }

    // Ambiguous free-text input triggers clarification rather than silently inventing CS objectives
    const ambiguous = interpretGoalDeterministically({
      rawGoalText: 'learn something',
      profile: baseProfile,
      todayISO: '2026-11-25',
    });
    expect(ambiguous.clarificationNeeded).toBe(true);
    expect(ambiguous.targetSkillIds).toEqual([]);
    expect(ambiguous.missingInformation.length).toBeGreaterThan(0);
  });

  it('uses local Llama output when ready and marks llm_local distinctly from deterministic fallback', async () => {
    const mockProvider: LocalAIProvider = {
      platform: 'web',
      initialize: vi.fn(async () => {}),
      loadModel: vi.fn(async () => {}),
      unloadModel: vi.fn(async () => {}),
      getCapabilities: vi.fn(async () => ({
        platform: 'web',
        backend: 'webgpu',
        supported: true,
        reasonIfUnsupported: null,
        estimatedRamMb: 4096,
        supportsStreaming: true,
      })),
      getDiagnostics: vi.fn(async () => ({
        platform: 'web',
        backend: 'webgpu',
        modelState: 'ready',
        modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        modelFileExists: true,
        tokenizerFileExists: true,
        modelFileSizeBytes: null,
        tokenizerFileSizeBytes: null,
        estimatedAvailableRamMb: 4096,
        totalRamMb: 8192,
        lowMemory: false,
        offlineReady: true,
        loadTimeMs: 420,
        lastError: null,
      })),
      isModelCached: vi.fn(async () => true),
      deleteCachedModel: vi.fn(async () => {}),
      generate: vi.fn(async () => ({
        text: JSON.stringify({
          normalizedTitle: 'Financial Accounting & Ratio Analysis',
          suggestedCategory: 'business_accounting',
          domainName: 'Accounting and Finance',
          subjectName: 'Business & Financial Accounting',
          expectedProficiency: 'intermediate',
          learningPurpose: 'professional',
          currentKnowledgeAssumptions: ['Starting with double-entry ledger concepts'],
          structuredObjectives: [
            'Master debits, credits, and trial balance preparation',
            'Interpret income statement and balance sheet ratios',
          ],
          recommendedSkillSlugs: [
            'accounting-double-entry-basics',
            'accounting-financial-statements',
          ],
          missingInformation: [],
          rationale: 'Aligned directly with core financial accounting progression.',
        }),
        stats: { promptTokens: 42, generatedTokens: 85, prefillMs: 120, decodeTokensPerSec: 18, totalTimeMs: 900 },
      })),
      generateStream: vi.fn(),
      cancel: vi.fn(async () => {}),
      dispose: vi.fn(async () => {}),
      getModelStatus: vi.fn(() => ({
        modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        state: 'ready',
        progressPercent: 100,
        statusMessage: 'Ready',
        errorMessage: null,
        loadTimeMs: 420,
        offlineReady: true,
        lastStats: null,
      })),
    };

    const service = new LocalAIAdvisoryService(mockProvider);
    const aiRes = await service.interpretGoal('I want to master corporate financial statements', [
      'accounting-double-entry-basics',
      'accounting-financial-statements',
    ]);
    expect(aiRes.ok).toBe(true);
    if (aiRes.ok) {
      const merged = mergeLlamaGoalInterpretation({
        rawGoalText: 'I want to master corporate financial statements',
        llamaOutput: aiRes.data,
        profile: baseProfile,
        todayISO: '2026-11-25',
      });
      expect(merged.interpretationSource).toBe('llm_local');
      expect(merged.domainId).toBe('dom_accounting');
      expect(merged.targetSkillIds).toEqual(['acct-basics', 'acct-statements']);
      expect(merged.estimatedLearningScope.totalHours).toBe(28);
    }
  });

  it('validates invalid dates, duplicate titles, unknown skills/domains, unrealistic deadlines, and prerequisites', () => {
    const existingGoal = createLearningGoal({
      id: 'g_existing',
      learnerId: 'u_g9',
      category: 'gate_ece',
      domainId: 'dom_ece',
      title: 'GATE ECE Signals Mastery',
      rawDescription: 'Master ECE signals',
      structuredObjectives: ['Solve Laplace & Fourier transforms'],
      targetSkillIds: ['ece-signals-systems'],
      interpretedByAI: false,
      now: '2026-11-25T10:00:00Z',
    });

    const bad = validateLearningGoalInput({
      title: 'GATE ECE Signals Mastery', // duplicate title
      domainId: 'dom_nonexistent',
      targetSkillIds: ['unsupported-skill-x'],
      targetCompletionDate: '2026-02-30', // invalid calendar date
      existingGoals: [existingGoal],
      profile: baseProfile,
      todayISO: '2026-11-25',
    });
    expect(bad.valid).toBe(false);
    expect(bad.duplicateGoalId).toBe('g_existing');
    expect(bad.unknownSkillIds).toEqual(['unsupported-skill-x']);
    expect(bad.errors.some((e) => e.includes('Unknown domain'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('Invalid target date'))).toBe(true);

    // Tight unrealistic deadline + missing prerequisite warning
    const tight = validateLearningGoalInput({
      title: 'Quantum & Mechanics Blitz',
      domainId: 'dom_physics_chem',
      targetSkillIds: ['phys-quantum-intro'],
      targetCompletionDate: '2026-12-02', // 7 days = 10h capacity vs 80h scope
      existingGoals: [existingGoal],
      profile: baseProfile,
      todayISO: '2026-11-25',
    });
    expect(tight.valid).toBe(true);
    expect(tight.isDeadlineUnrealistic).toBe(true);
    expect(tight.missingPrerequisiteIds).toEqual(['phys-math-methods', 'phys-mechanics', 'phys-electromagnetism']);
  });

  it('supports multiple simultaneous goals, prioritization within available hours, and IndexedDB edit/archive/delete persistence', async () => {
    const repo = new IndexedDBLearningRepository();
    await repo.initialize();

    let goalEce = createLearningGoal({
      id: 'g_ece',
      learnerId: 'u_g9',
      category: 'gate_ece',
      domainId: 'dom_ece',
      title: 'GATE ECE Preparation',
      rawDescription: 'Signals & electronics',
      structuredObjectives: ['Master network theory & signals'],
      targetSkillIds: ['ece-control-comm'],
      interpretedByAI: false,
      priority: 'high',
      targetCompletionDate: '2026-12-20',
      now: '2026-11-25T09:00:00Z',
    });

    const goalAcct = createLearningGoal({
      id: 'g_acct',
      learnerId: 'u_g9',
      category: 'business_accounting',
      domainId: 'dom_accounting',
      title: 'Business Accounting Foundations',
      rawDescription: 'Double-entry & financial ratios',
      structuredObjectives: ['Analyze financial statements'],
      targetSkillIds: ['acct-statements'],
      interpretedByAI: false,
      priority: 'low',
      targetCompletionDate: '2027-06-01',
      now: '2026-11-25T09:05:00Z',
    });

    const report = prioritizeAndAllocateGoals({
      goals: [goalAcct, goalEce],
      profile: baseProfile, // 10h/wk strict budget
      learnerSkills: [],
      todayISO: '2026-11-25',
    });

    expect(report.weeklyCapacityHours).toBe(10);
    expect(report.totalAllocatedWeeklyHours).toBeLessThanOrEqual(10);
    expect(report.allocations).toHaveLength(2);
    expect(report.allocations[0]!.goalId).toBe('g_ece'); // high + urgent outranks low
    expect(report.allocations[0]!.allocatedWeeklyHours).toBeGreaterThan(
      report.allocations[1]!.allocatedWeeklyHours,
    );
    expect(report.exceedsCapacity).toBe(true);

    // Lifecycle transitions & edit history persisted in IndexedDB
    goalEce = setGoalPriority(goalEce, 'medium', 'Balanced schedule', '2026-11-25T10:00:00Z');
    goalEce = updateLearningGoal(goalEce, { targetCompletionDate: '2027-02-15' }, 'Extended exam prep date', '2026-11-25T10:15:00Z');
    let goalAcctPaused = transitionGoalStatus(goalAcct, 'paused', 'Focus on ECE first', '2026-11-25T10:20:00Z');
    goalAcctPaused = transitionGoalStatus(goalAcctPaused, 'archived', 'Archived term goal', '2026-11-25T10:30:00Z');

    await repo.saveLearnerAndProfile(
      { id: 'u_g9', displayName: 'Tester', createdAt: '2026-11-25T09:00:00Z', updatedAt: '2026-11-25T09:00:00Z' },
      baseProfile,
    );
    await repo.saveGoal(goalEce);
    await repo.saveGoal(goalAcctPaused);
    await repo.saveSettings(createDefaultSettings('web'));

    const snap1 = await repo.loadSnapshot();
    expect(snap1.goals).toHaveLength(2);
    const savedAcct = snap1.goals.find((g) => g.id === 'g_acct')!;
    expect(savedAcct.status).toBe('archived');
    expect(savedAcct.isActive).toBe(false);
    expect(savedAcct.history?.length).toBe(3);

    const backup = await exportSnapshotToBackup(snap1, 'web');
    const verified = await validateAndParseImportBackup(JSON.stringify(backup));
    expect(verified.ok).toBe(true);

    await repo.deleteGoal('g_acct');
    const snap2 = await repo.loadSnapshot();
    expect(snap2.goals.map((g) => g.id)).toEqual(['g_ece']);
    await repo.close();
  });
});
