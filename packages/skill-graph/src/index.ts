import type { LearnerSkill, Skill, SkillPrerequisite } from '@alc/shared-types';

export interface CycleDetectionResult {
  hasCycle: boolean;
  cyclePath: string[];
}

export interface GraphIntegrityResult {
  valid: boolean;
  hasCycle: boolean;
  cyclePath: string[];
  danglingEdges: SkillPrerequisite[];
  selfLoops: SkillPrerequisite[];
}

export interface ReadinessResult {
  ready: boolean;
  blockingPrerequisites: string[];
  unassessedPrerequisites: string[];
  weakPrerequisites: string[];
  recommendedPrerequisites: string[];
}

export const DEFAULT_MASTERY_THRESHOLD = 65;

export class SkillGraph {
  private readonly skills = new Map<string, Skill>();
  private readonly prerequisitesOf = new Map<string, SkillPrerequisite[]>();
  private readonly dependentsOf = new Map<string, string[]>();
  private readonly allEdges: SkillPrerequisite[] = [];
  private readonly danglingEdges: SkillPrerequisite[] = [];
  private readonly selfLoops: SkillPrerequisite[] = [];

  constructor(skills: Skill[], edges: SkillPrerequisite[]) {
    for (const s of skills) {
      this.skills.set(s.id, s);
      this.prerequisitesOf.set(s.id, []);
      this.dependentsOf.set(s.id, []);
    }
    for (const edge of edges) {
      this.allEdges.push(edge);
      if (edge.skillId === edge.prerequisiteSkillId) {
        this.selfLoops.push(edge);
      }
      if (!this.skills.has(edge.skillId) || !this.skills.has(edge.prerequisiteSkillId)) {
        this.danglingEdges.push(edge);
        continue;
      }
      this.prerequisitesOf.get(edge.skillId)!.push(edge);
      this.dependentsOf.get(edge.prerequisiteSkillId)!.push(edge.skillId);
    }
  }

  getSkill(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  getDirectPrerequisites(skillId: string): SkillPrerequisite[] {
    return this.prerequisitesOf.get(skillId) ?? [];
  }

  getTransitivePrerequisites(skillId: string): string[] {
    if (!this.skills.has(skillId)) return [];
    const visited = new Set<string>();
    const stack = [...this.getDirectPrerequisites(skillId).map((e) => e.prerequisiteSkillId)];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const parent of this.getDirectPrerequisites(current)) {
        if (!visited.has(parent.prerequisiteSkillId)) {
          stack.push(parent.prerequisiteSkillId);
        }
      }
    }
    return Array.from(visited);
  }

  getTransitiveRequiredPrerequisites(skillId: string): string[] {
    if (!this.skills.has(skillId)) return [];
    const visited = new Set<string>();
    const stack = [
      ...this.getDirectPrerequisites(skillId)
        .filter((e) => e.strictness === 'required')
        .map((e) => e.prerequisiteSkillId),
    ];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const parent of this.getDirectPrerequisites(current)) {
        if (parent.strictness === 'required' && !visited.has(parent.prerequisiteSkillId)) {
          stack.push(parent.prerequisiteSkillId);
        }
      }
    }
    return Array.from(visited);
  }

  /**
   * Returns all downstream skills transitively unlocked by mastering `skillId`.
   */
  getUnlockImpact(skillId: string): Skill[] {
    if (!this.skills.has(skillId)) return [];
    const visited = new Set<string>();
    const stack = [...(this.dependentsOf.get(skillId) ?? [])];
    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (visited.has(curr) || curr === skillId) continue;
      visited.add(curr);
      for (const next of this.dependentsOf.get(curr) ?? []) {
        if (!visited.has(next)) stack.push(next);
      }
    }
    return Array.from(visited)
      .map((id) => this.skills.get(id))
      .filter((s): s is Skill => Boolean(s));
  }

  getSkillsByLevel(level: Skill['difficulty']): Skill[] {
    return Array.from(this.skills.values()).filter((s) => s.difficulty === level);
  }

  /**
   * Extracts nodes and edges scoped to the requested target skills and their prerequisites.
   */
  getSubgraphForTargets(targetSkillIds: string[]): {
    nodes: Skill[];
    edges: SkillPrerequisite[];
    danglingEdges: SkillPrerequisite[];
  } {
    const scope = new Set<string>();
    for (const id of targetSkillIds) {
      if (this.skills.has(id)) {
        scope.add(id);
        for (const pre of this.getTransitivePrerequisites(id)) {
          scope.add(pre);
        }
      }
    }
    const nodes = Array.from(scope)
      .map((id) => this.skills.get(id))
      .filter((s): s is Skill => Boolean(s));
    const edges = this.allEdges.filter(
      (e) => scope.has(e.skillId) && scope.has(e.prerequisiteSkillId),
    );
    const danglingEdges = this.danglingEdges.filter(
      (e) => scope.has(e.skillId) || scope.has(e.prerequisiteSkillId),
    );
    return { nodes, edges, danglingEdges };
  }

  /**
   * Returns prerequisites ordered safely before target skill (empty if cycle exists).
   */
  getPrerequisiteChain(skillId: string): Skill[] {
    if (!this.skills.has(skillId)) return [];
    const topo = this.getTopologicalOrder([skillId]);
    if (topo.hasCycle) return [];
    return topo.order
      .map((id) => this.skills.get(id))
      .filter((s): s is Skill => Boolean(s));
  }

  /**
   * 3-color DFS cycle detection across directed prerequisite edges (prereq -> skill).
   */
  detectCycles(): CycleDetectionResult {
    const state = new Map<string, 0 | 1 | 2>(); // 0=unvisited, 1=visiting, 2=visited
    const stack: string[] = [];

    const dfs = (nodeId: string): string[] | null => {
      state.set(nodeId, 1);
      stack.push(nodeId);
      const nextNodes = this.dependentsOf.get(nodeId) ?? [];
      for (const dep of nextNodes) {
        const depState = state.get(dep) ?? 0;
        if (depState === 1) {
          const cycleStart = stack.indexOf(dep);
          return [...stack.slice(cycleStart), dep];
        }
        if (depState === 0) {
          const found = dfs(dep);
          if (found) return found;
        }
      }
      stack.pop();
      state.set(nodeId, 2);
      return null;
    };

    for (const skillId of this.skills.keys()) {
      if ((state.get(skillId) ?? 0) === 0) {
        const cycle = dfs(skillId);
        if (cycle) {
          return { hasCycle: true, cyclePath: cycle };
        }
      }
    }
    return { hasCycle: false, cyclePath: [] };
  }

  validateIntegrity(): GraphIntegrityResult {
    const cycle = this.detectCycles();
    return {
      valid: !cycle.hasCycle && this.danglingEdges.length === 0 && this.selfLoops.length === 0,
      hasCycle: cycle.hasCycle,
      cyclePath: cycle.cyclePath,
      danglingEdges: [...this.danglingEdges],
      selfLoops: [...this.selfLoops],
    };
  }

  /**
   * Topological ordering using Kahn's algorithm.
   * If targetSkillIds is provided, restricts ordering to target skills + all transitive prerequisites.
   */
  getTopologicalOrder(targetSkillIds?: string[]): { order: string[]; hasCycle: boolean; cyclePath: string[] } {
    const cycleCheck = this.detectCycles();
    if (cycleCheck.hasCycle) {
      return { order: [], hasCycle: true, cyclePath: cycleCheck.cyclePath };
    }

    const scope = new Set<string>();
    if (targetSkillIds && targetSkillIds.length > 0) {
      for (const id of targetSkillIds) {
        if (this.skills.has(id)) {
          scope.add(id);
          for (const pre of this.getTransitivePrerequisites(id)) {
            scope.add(pre);
          }
        }
      }
    } else {
      for (const id of this.skills.keys()) scope.add(id);
    }

    const inDegree = new Map<string, number>();
    for (const id of scope) {
      const prereqsInScope = this.getDirectPrerequisites(id).filter((e) =>
        scope.has(e.prerequisiteSkillId),
      );
      inDegree.set(id, prereqsInScope.length);
    }

    const difficultyRank = (id: string): number => {
      const d = this.skills.get(id)?.difficulty;
      return d === 'beginner' ? 0 : d === 'intermediate' ? 1 : 2;
    };

    const queue = Array.from(scope)
      .filter((id) => (inDegree.get(id) ?? 0) === 0)
      .sort((a, b) => difficultyRank(a) - difficultyRank(b) || a.localeCompare(b));

    const order: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);
      const dependents = (this.dependentsOf.get(current) ?? []).filter((d) => scope.has(d));
      for (const dep of dependents) {
        const nextDeg = (inDegree.get(dep) ?? 0) - 1;
        inDegree.set(dep, nextDeg);
        if (nextDeg === 0) {
          queue.push(dep);
          queue.sort((a, b) => difficultyRank(a) - difficultyRank(b) || a.localeCompare(b));
        }
      }
    }

    return { order, hasCycle: false, cyclePath: [] };
  }

  /**
   * Checks whether a learner is ready for a skill based ONLY on verified assessment evidence
   * across all transitive required prerequisites. Never grants readiness from self-reported confidence.
   */
  checkReadiness(
    skillId: string,
    learnerSkills: LearnerSkill[],
    masteryThreshold = DEFAULT_MASTERY_THRESHOLD,
  ): ReadinessResult {
    const map = new Map(learnerSkills.map((ls) => [ls.skillId, ls]));
    const requiredIds = this.getTransitiveRequiredPrerequisites(skillId);
    const recommendedIds = this.getDirectPrerequisites(skillId)
      .filter((e) => e.strictness === 'recommended')
      .map((e) => e.prerequisiteSkillId);

    const blockingPrerequisites: string[] = [];
    const unassessedPrerequisites: string[] = [];
    const weakPrerequisites: string[] = [];
    const recommendedPrerequisites: string[] = [];

    for (const reqId of requiredIds) {
      const ls = map.get(reqId);
      if (!ls || ls.assessmentCount === 0) {
        unassessedPrerequisites.push(reqId);
        blockingPrerequisites.push(reqId);
      } else if (ls.demonstratedCompetence < masteryThreshold) {
        weakPrerequisites.push(reqId);
        blockingPrerequisites.push(reqId);
      }
    }

    for (const recId of recommendedIds) {
      const ls = map.get(recId);
      if (!ls || ls.assessmentCount === 0 || ls.demonstratedCompetence < masteryThreshold) {
        recommendedPrerequisites.push(recId);
      }
    }

    return {
      ready: blockingPrerequisites.length === 0,
      blockingPrerequisites,
      unassessedPrerequisites,
      weakPrerequisites,
      recommendedPrerequisites,
    };
  }
}
