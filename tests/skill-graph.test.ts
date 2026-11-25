import { describe, expect, it } from 'vitest';
import type { LearnerSkill, Skill, SkillPrerequisite } from '@alc/shared-types';
import { SkillGraph } from '../packages/skill-graph/src/index';
import { CORE_PREREQUISITES, CORE_SKILLS } from '../packages/learning-engine/src/index';

describe('SkillGraph prerequisite & cycle engine', () => {
  it('verifies core curriculum graph is acyclic and produces valid topological order', () => {
    const graph = new SkillGraph(CORE_SKILLS, CORE_PREREQUISITES);
    const cycle = graph.detectCycles();
    expect(cycle.hasCycle).toBe(false);
    expect(cycle.cyclePath).toEqual([]);

    const topo = graph.getTopologicalOrder(['react-ui']);
    expect(topo.hasCycle).toBe(false);
    expect(topo.order.indexOf('prog-fundamentals')).toBeLessThan(topo.order.indexOf('js-ts'));
    expect(topo.order.indexOf('js-ts')).toBeLessThan(topo.order.indexOf('react-ui'));
    expect(topo.order.indexOf('html-css')).toBeLessThan(topo.order.indexOf('react-ui'));
  });

  it('detects circular prerequisite dependencies accurately', () => {
    const skills: Skill[] = [
      { id: 'a', slug: 'a', name: 'A', domain: 'CS', description: '', difficulty: 'beginner', estimatedHours: 2 },
      { id: 'b', slug: 'b', name: 'B', domain: 'CS', description: '', difficulty: 'beginner', estimatedHours: 2 },
      { id: 'c', slug: 'c', name: 'C', domain: 'CS', description: '', difficulty: 'beginner', estimatedHours: 2 },
    ];
    const edges: SkillPrerequisite[] = [
      { id: '1', skillId: 'b', prerequisiteSkillId: 'a', strictness: 'required' },
      { id: '2', skillId: 'c', prerequisiteSkillId: 'b', strictness: 'required' },
      { id: '3', skillId: 'a', prerequisiteSkillId: 'c', strictness: 'required' },
    ];
    const graph = new SkillGraph(skills, edges);
    const cycle = graph.detectCycles();
    expect(cycle.hasCycle).toBe(true);
    expect(cycle.cyclePath.length).toBeGreaterThanOrEqual(3);
  });

  it('blocks advanced skills when prerequisites are unassessed even if self-reported confidence is high', () => {
    const graph = new SkillGraph(CORE_SKILLS, CORE_PREREQUISITES);
    const unassessedHighConfidence: LearnerSkill[] = [
      {
        id: 'ls1',
        learnerId: 'u1',
        skillId: 'ml-foundations',
        selfReportedConfidence: 95,
        demonstratedCompetence: 0,
        assessmentCount: 0,
        lastAssessedAt: null,
        status: 'unassessed',
        updatedAt: '2026-11-25T00:00:00Z',
      },
    ];

    const readiness = graph.checkReadiness('deep-learning-llm', unassessedHighConfidence);
    expect(readiness.ready).toBe(false);
    expect(readiness.unassessedPrerequisites).toContain('ml-foundations');
  });
});
