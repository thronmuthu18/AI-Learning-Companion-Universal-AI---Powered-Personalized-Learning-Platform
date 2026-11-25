# STRUCTURED GOAL INTERPRETATION & VALIDATION (Phase 09)

## Interpretation Pipeline
Every natural-language goal produces a `StructuredGoalInterpretation`:
- `title`, `domainId` / `domainName`, `category`, `subjectId` / `subjectName`
- `targetSkillIds` & `targetSkillNames` resolved from `DomainRegistry`
- `currentKnowledgeAssumptions` & `expectedProficiencyLevel` (`beginner` | `intermediate` | `advanced`)
- `learningPurpose` (`academic` | `professional` | `examination` | `personal`) & `horizon` (`short_term` | `long_term`)
- `targetCompletionDate`
- `estimatedLearningScope` (`totalHours`, `prerequisiteHours`, `targetHours`, `weeklyCommitmentHours`, `estimatedWeeks`)
- `requiredAssessmentInformation` (`skillsNeedingDiagnostic`, `missingPrerequisiteIds`, `recommendedQuestionModes`)
- `missingInformation` & `clarificationNeeded`
- `interpretationSource`: explicitly `'llm_local'` OR `'deterministic_fallback'`

## Local Llama vs. Deterministic Fallback Rule
- When Meta Llama 3.2 is ready (`aiStatus.state === 'ready'`), `LocalAIAdvisoryService.interpretGoal` validates strict JSON via `AIGoalInterpretationSchema` (`@alc/validation`) and merges with `mergeLlamaGoalInterpretation` (`'llm_local'`).
- When Llama is unavailable or unloaded, the system **never simulates AI responses** — instead `interpretGoalDeterministically` matches domain/skill keywords honestly (`'deterministic_fallback'`) and asks clarification questions when a prompt is ambiguous or lacks bundled domain coverage.

## Goal Validation (`validateLearningGoalInput`)
Explicitly checks empty/short goals, ambiguous targets, unknown domains, unsupported skill IDs, invalid calendar dates, past target dates, unrealistic deadlines against profile weekly hours, duplicate non-archived goals, and missing prerequisites.
