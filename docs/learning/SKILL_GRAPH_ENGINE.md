# SKILL GRAPH & PREREQUISITE ENGINE (`@alc/skill-graph` & `@alc/learning-engine`)

## Responsibilities
- Models domain-independent competencies (`Skill`) and directed prerequisite edges (`SkillPrerequisite`, `required` vs `recommended`) across all 30 universal domains and custom runtime domains.
- Enforces Directed Acyclic Graph (DAG) integrity via `validateIntegrity()` and 3-color DFS `detectCycles()`, surfacing `cyclePath`, `danglingEdges`, and `selfLoops`.
- Computes prerequisite-safe study order via Kahn topological sort (`getTopologicalOrder`) prioritizing beginner -> intermediate -> advanced levels.
- Exposes dependency subgraphs and impact queries (`getSubgraphForTargets`, `getUnlockImpact`, `getTransitiveRequiredPrerequisites`, `getPrerequisiteChain`, `getSkillsByLevel`).
- Enforces **transitive** prerequisite readiness (`checkReadiness`) strictly on **assessment-backed** `demonstratedCompetence >= threshold` with `assessmentCount > 0` (never trusting self-reported confidence alone and never recommending advanced skills ahead of unassessed/unmastered foundations).
- `analyzeSkillGap` (`@alc/learning-engine`) compares verified competence against configurable target proficiency (`targetProficiencyPercent`), outputting categorized skills (`strong`, `weak`, `missing`, `unassessed`), `recommendedNextSkills`, `blockedSkills`, `dependencyChains`, `unlockImpactMap`, `prerequisiteEdges`, and `proficiencyComparisons`.
