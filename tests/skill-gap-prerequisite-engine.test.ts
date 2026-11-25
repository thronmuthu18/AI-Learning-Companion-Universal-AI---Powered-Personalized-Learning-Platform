import { describe, expect, it } from 'vitest';
import { SkillGraph } from '@alc/skill-graph';
import { analyzeSkillGap, DomainRegistry } from '@alc/learning-engine';
import type { LearnerSkill, Skill, SkillPrerequisite } from '@alc/shared-types';

function makeAssessed(skillId: string, competence: number, confidence = 50): LearnerSkill {
  return {
    id: `ls_${skillId}`,
    learnerId: 'u_sg',
    skillId,
    selfReportedConfidence: confidence,
    demonstratedCompetence: competence,
    assessmentCount: 1,
    lastAssessedAt: '2026-11-25T10:00:00Z',
    status: competence >= 75 ? 'strong' : competence >= 45 ? 'weak' : 'missing',
    updatedAt: '2026-11-25T10:00:00Z',
  };
}

describe('Phase 11 — Cross-Domain Skill-Gap & Prerequisite Engine', () => {
  it('enforces transitive prerequisites across Physics, GATE ECE, and Business Accounting DAGs', () => {
    // Learner assessed intermediate 'phys-electromagnetism' at 82%, BUT skipped foundation 'phys-math-methods' (unassessed)
    const partialPhysics: LearnerSkill[] = [
      makeAssessed('phys-mechanics', 78),
      makeAssessed('phys-electromagnetism', 82),
    ];

    const gapBlocked = analyzeSkillGap({
      targetSkillIds: ['phys-quantum-intro'],
      learnerSkills: partialPhysics,
      targetProficiencyPercent: 80,
      prerequisiteThresholdPercent: 65,
    });

    expect(gapBlocked.hasCycle).toBe(false);
    // Advanced 'phys-quantum-intro' MUST stay blocked transitively because 'phys-math-methods' is unassessed!
    expect(gapBlocked.recommendedNextSkills.map((s) => s.id)).toEqual(['phys-math-methods']);
    expect(gapBlocked.blockedSkills.some((b) => b.skill.id === 'phys-quantum-intro')).toBe(true);
    const quantumBlocker = gapBlocked.blockedSkills.find((b) => b.skill.id === 'phys-quantum-intro')!;
    expect(quantumBlocker.blockedBy.map((s) => s.id)).toContain('phys-math-methods');

    // Once 'phys-math-methods' is assessed at 70% (>= 65 prereq threshold), quantum unlocks!
    const withFoundation = analyzeSkillGap({
      targetSkillIds: ['phys-quantum-intro'],
      learnerSkills: [makeAssessed('phys-math-methods', 70), ...partialPhysics],
      targetProficiencyPercent: 80,
      prerequisiteThresholdPercent: 65,
    });
    expect(withFoundation.recommendedNextSkills.map((s) => s.id)).toContain('phys-quantum-intro');
    // At 80% target threshold, 70% math and 78% mechanics still reflect proficiency gaps accurately
    const mathComp = withFoundation.proficiencyComparisons.find((p) => p.skillId === 'phys-math-methods')!;
    expect(mathComp.gapPercent).toBe(10);
    expect(mathComp.ready).toBe(true);
  });

  it('computes unlock impact, scoped dependency chains, and never trusts high unassessed self-confidence', () => {
    const unassessedOverconfident: LearnerSkill[] = [
      {
        id: 'ls_ece_unassessed',
        learnerId: 'u_ece',
        skillId: 'ece-network-theory',
        selfReportedConfidence: 95,
        demonstratedCompetence: 0,
        assessmentCount: 0,
        lastAssessedAt: null,
        status: 'unassessed',
        updatedAt: '2026-11-25T00:00:00Z',
      },
    ];

    const eceGap = analyzeSkillGap({
      targetSkillIds: ['ece-control-comm'],
      learnerSkills: unassessedOverconfident,
    });
    expect(eceGap.recommendedNextSkills.map((s) => s.id)).toEqual(['ece-network-theory']);
    expect(eceGap.unlockImpactMap['ece-network-theory']).toContain('ece-signals-systems');
    expect(eceGap.unlockImpactMap['ece-network-theory']).toContain('ece-control-comm');
    expect(eceGap.dependencyChains[0]?.chainSkillIds).toEqual([
      'ece-network-theory',
      'ece-signals-systems',
      'ece-control-comm',
    ]);
    expect(eceGap.prerequisiteEdges.map((e) => `${e.prerequisiteSkillId}->${e.skillId}`)).toEqual([
      'ece-network-theory->ece-signals-systems',
      'ece-signals-systems->ece-control-comm',
    ]);

    // Verify subgraph extraction in Business Accounting excludes unrelated domain edges
    const acctGap = analyzeSkillGap({
      targetSkillIds: ['acct-cost-managerial'],
      learnerSkills: [makeAssessed('acct-basics', 72)], // satisfies 65 prereq threshold, weak against 75 target
      targetProficiencyPercent: 75,
      prerequisiteThresholdPercent: 65,
    });
    expect(acctGap.prerequisiteEdges.every((e) => e.skillId.startsWith('acct-'))).toBe(true);
    expect(acctGap.recommendedNextSkills.map((s) => s.id)).toEqual(['acct-basics', 'acct-statements']);
    expect(acctGap.blockedSkills.map((b) => b.skill.id)).toEqual(['acct-cost-managerial']);
  });

  it('detects circular dependencies, self-loops, dangling edges, and works on runtime custom domains', () => {
    const customSkills: Skill[] = [
      { id: 'med-anat', slug: 'med-anatomy', name: 'Human Anatomy', domain: 'Medical', description: 'Structures', difficulty: 'beginner', estimatedHours: 10 },
      { id: 'med-physio', slug: 'med-physiology', name: 'Systemic Physiology', domain: 'Medical', description: 'Functions', difficulty: 'intermediate', estimatedHours: 14 },
      { id: 'med-clin', slug: 'med-clinical', name: 'Clinical Reasoning', domain: 'Medical', description: 'Diagnosis', difficulty: 'advanced', estimatedHours: 16 },
    ];
    const cyclicEdges: SkillPrerequisite[] = [
      { id: 'm1', skillId: 'med-physio', prerequisiteSkillId: 'med-anat', strictness: 'required' },
      { id: 'm2', skillId: 'med-clin', prerequisiteSkillId: 'med-physio', strictness: 'required' },
      { id: 'm3', skillId: 'med-anat', prerequisiteSkillId: 'med-clin', strictness: 'required' },
      { id: 'm_bad', skillId: 'med-anat', prerequisiteSkillId: 'missing-node', strictness: 'required' },
    ];

    const graph = new SkillGraph(customSkills, cyclicEdges);
    const integrity = graph.validateIntegrity();
    expect(integrity.valid).toBe(false);
    expect(integrity.hasCycle).toBe(true);
    expect(integrity.cyclePath.length).toBeGreaterThanOrEqual(3);
    expect(integrity.danglingEdges).toHaveLength(1);

    const cyclicGap = analyzeSkillGap({
      targetSkillIds: ['med-clin'],
      learnerSkills: [],
      skills: customSkills,
      prerequisites: cyclicEdges,
    });
    expect(cyclicGap.hasCycle).toBe(true);
    expect(cyclicGap.recommendedNextSkills).toEqual([]);

    // Valid runtime medical domain without cycle succeeds identically via DomainRegistry
    const medRegistry = new DomainRegistry({
      domains: [{ id: 'dom_med_rt', name: 'Medical Education', summary: 'Medical sciences', contentStatus: 'user_created' }],
      skills: customSkills.map((s) => ({ ...s, domainId: 'dom_med_rt' })),
      prerequisites: cyclicEdges.slice(0, 2),
    });
    const validMedGap = analyzeSkillGap({
      targetSkillIds: ['med-clin'],
      learnerSkills: [],
      registry: medRegistry,
    });
    expect(validMedGap.hasCycle).toBe(false);
    expect(validMedGap.topologicalOrder.map((s) => s.id)).toEqual(['med-anat', 'med-physio', 'med-clin']);
    expect(validMedGap.recommendedNextSkills.map((s) => s.id)).toEqual(['med-anat']);
  });
});
