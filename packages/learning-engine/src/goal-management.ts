import type {
  DifficultyLevel,
  DomainDefinition,
  GoalHistoryEntry,
  GoalHorizon,
  GoalKind,
  GoalLifecycleStatus,
  GoalPriority,
  LearnerProfile,
  LearnerSkill,
  LearningGoal,
  Skill,
  StudySchedule,
} from '@alc/shared-types';
import { SkillGraph } from '@alc/skill-graph';
import { defaultDomainRegistry, type DomainRegistry } from './universal-catalog';

export interface GoalInterpretationScope {
  totalHours: number;
  prerequisiteHours: number;
  targetHours: number;
  weeklyCommitmentHours: number;
  estimatedWeeks: number;
}

export interface GoalAssessmentRequirement {
  skillsNeedingDiagnostic: string[];
  missingPrerequisiteIds: string[];
  recommendedQuestionModes: string[];
}

export interface StructuredGoalInterpretation {
  title: string;
  domainId: string | null;
  domainName: string;
  category: string;
  subjectId: string | null;
  subjectName: string;
  targetSkillIds: string[];
  targetSkillNames: string[];
  structuredObjectives: string[];
  currentKnowledgeAssumptions: string[];
  expectedProficiencyLevel: DifficultyLevel;
  learningPurpose: GoalKind;
  horizon: GoalHorizon;
  targetCompletionDate: string | null;
  estimatedLearningScope: GoalInterpretationScope;
  requiredAssessmentInformation: GoalAssessmentRequirement;
  missingInformation: string[];
  clarificationNeeded: boolean;
  interpretationSource: 'llm_local' | 'deterministic_fallback';
  rationale: string;
}

export interface GoalValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  clarificationQuestions: string[];
  missingPrerequisiteIds: string[];
  unknownSkillIds: string[];
  duplicateGoalId: string | null;
  isDeadlineUnrealistic: boolean;
}

export interface GoalWorkloadAllocation {
  goalId: string;
  title: string;
  priority: GoalPriority;
  priorityScore: number;
  remainingHours: number;
  allocatedWeeklyHours: number;
  estimatedWeeksAtAllocation: number;
  missingPrerequisiteIds: string[];
  deadlineWarning: string | null;
  recommendedFocus: string;
}

export interface MultiGoalPrioritizationReport {
  weeklyCapacityHours: number;
  totalRequestedHoursPerWeek: number;
  totalAllocatedWeeklyHours: number;
  exceedsCapacity: boolean;
  overloadWarning: string | null;
  allocations: GoalWorkloadAllocation[];
}

const DOMAIN_KEYWORD_MAP: Array<{ domainId: string; keywords: string[]; defaultKind?: GoalKind }> = [
  { domainId: 'dom_ece', keywords: ['gate ece', 'ece', 'signals', 'signal', 'laplace', 'fourier', 'network theory', 'analog', 'vlsi', 'control system', 'electronics'], defaultKind: 'examination' },
  { domainId: 'dom_accounting', keywords: ['accounting', 'bookkeeping', 'balance sheet', 'ledger', 'cost accounting', 'financial statement', 'finance', 'debit', 'credit'], defaultKind: 'professional' },
  { domainId: 'dom_physics_chem', keywords: ['physics', 'mechanics', 'electromagnetism', 'quantum', 'kinematics', 'maxwell', 'thermodynamics', 'chemistry'], defaultKind: 'academic' },
  { domainId: 'dom_competitive_exams', keywords: ['upsc', 'gre', 'gmat', 'aptitude', 'competitive exam', 'ssc', 'cat exam', 'logical reasoning', 'mock test'], defaultKind: 'examination' },
  { domainId: 'dom_govt_exams', keywords: ['upsc', 'civil service', 'ias', 'ips', 'public service', 'government exam', 'polity', 'civics'], defaultKind: 'examination' },
  { domainId: 'dom_languages', keywords: ['english', 'communication', 'verbal', 'speaking', 'writing', 'grammar', 'comprehension', 'language'], defaultKind: 'personal' },
  { domainId: 'dom_design', keywords: ['graphic design', 'typography', 'visual design', 'ui design', 'ux', 'branding', 'illustrator'], defaultKind: 'professional' },
  { domainId: 'dom_programming', keywords: ['python', 'javascript', 'typescript', 'react', 'frontend', 'backend', 'full stack', 'node', 'software', 'coding'], defaultKind: 'professional' },
  { domainId: 'dom_ai_ml', keywords: ['machine learning', 'deep learning', 'llm', 'neural network', 'ai engineer', 'artificial intelligence'], defaultKind: 'professional' },
  { domainId: 'dom_data_science', keywords: ['data science', 'data analysis', 'pandas', 'numpy', 'analytics', 'statistics'], defaultKind: 'professional' },
  { domainId: 'dom_cybersecurity', keywords: ['cybersecurity', 'security', 'owasp', 'network security', 'penetration', 'appsec'], defaultKind: 'professional' },
  { domainId: 'dom_cs_it', keywords: ['gate cs', 'algorithms', 'data structures', 'sql', 'database', 'operating system', 'dbms', 'computer science'], defaultKind: 'academic' },
  { domainId: 'dom_math_stats', keywords: ['mathematics', 'linear algebra', 'calculus', 'probability', 'statistics', 'matrices'], defaultKind: 'academic' },
  { domainId: 'dom_medical', keywords: ['medical', 'anatomy', 'physiology', 'clinical', 'pharmacology', 'healthcare'], defaultKind: 'academic' },
  { domainId: 'dom_vocational', keywords: ['vocational', 'electrician', 'wiring', 'cnc', 'plumbing', 'machining', 'workshop', 'repair'], defaultKind: 'professional' },
  { domainId: 'dom_business', keywords: ['business management', 'operations', 'strategy', 'leadership', 'project management'], defaultKind: 'professional' },
  { domainId: 'dom_law', keywords: ['law', 'legal', 'constitutional', 'contracts'], defaultKind: 'academic' },
  { domainId: 'dom_music', keywords: ['music', 'guitar', 'piano', 'rhythm', 'harmony', 'ear training'], defaultKind: 'personal' },
];

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isValidIsoCalendarDate(dateISO: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false;
  const parsed = new Date(`${dateISO}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === dateISO;
}

function daysBetweenISO(startISO: string, endISO: string): number {
  const start = new Date(`${startISO}T00:00:00Z`).getTime();
  const end = new Date(`${endISO}T00:00:00Z`).getTime();
  return Math.floor((end - start) / 86_400_000);
}

function inferProficiency(text: string): DifficultyLevel {
  const lower = text.toLowerCase();
  if (/(advanced|mastery|expert|gate|olympiad|research|deep dive)/.test(lower)) return 'advanced';
  if (/(intermediate|job ready|production|statements|ratio|apply)/.test(lower)) return 'intermediate';
  return 'beginner';
}

function inferPurpose(text: string, fallbackKind?: GoalKind): GoalKind {
  const lower = text.toLowerCase();
  if (/(gate|upsc|gre|exam|test|crack|qualify|certification|mock)/.test(lower)) return 'examination';
  if (/(degree|semester|coursework|university|class |school|physics|academic|study )/.test(lower)) return 'academic';
  if (/(career|job|role|business|accounting|engineer|designer|vocational|work)/.test(lower)) return 'professional';
  return fallbackKind ?? 'personal';
}

function inferHorizon(targetCompletionDate: string | null, estimatedWeeks: number, todayISO: string): GoalHorizon {
  if (targetCompletionDate && isValidIsoCalendarDate(targetCompletionDate)) {
    const days = daysBetweenISO(todayISO, targetCompletionDate);
    return days <= 60 ? 'short_term' : 'long_term';
  }
  return estimatedWeeks <= 8 ? 'short_term' : 'long_term';
}

function computeScopeFromSkills(params: {
  targetSkillIds: string[];
  learnerSkills: LearnerSkill[];
  profile: LearnerProfile | null;
  registry: DomainRegistry;
}): {
  scope: GoalInterpretationScope;
  assessmentReq: GoalAssessmentRequirement;
} {
  const { targetSkillIds, learnerSkills, profile, registry } = params;
  const allSkills = registry.getAllSkills();
  const allPrereqs = registry.getAllPrerequisites();
  const skillById = new Map(allSkills.map((s) => [s.id, s]));
  const lsById = new Map(learnerSkills.map((ls) => [ls.skillId, ls]));

  const weeklyHours = Math.max(
    1,
    Number(((profile?.availableHoursPerDay ?? 2) * (profile?.studyDaysPerWeek ?? 5)).toFixed(1)),
  );

  if (targetSkillIds.length === 0) {
    return {
      scope: {
        totalHours: 0,
        prerequisiteHours: 0,
        targetHours: 0,
        weeklyCommitmentHours: weeklyHours,
        estimatedWeeks: 0,
      },
      assessmentReq: {
        skillsNeedingDiagnostic: [],
        missingPrerequisiteIds: [],
        recommendedQuestionModes: [],
      },
    };
  }

  const graph = new SkillGraph(allSkills, allPrereqs);
  const topo = graph.getTopologicalOrder(targetSkillIds);
  const targetSet = new Set(targetSkillIds);

  let prerequisiteHours = 0;
  let targetHours = 0;
  const skillsNeedingDiagnostic: string[] = [];
  const missingPrerequisiteIds: string[] = [];
  const modesSet = new Set<string>();

  for (const id of topo.order) {
    const sk = skillById.get(id);
    if (!sk) continue;
    const ls = lsById.get(id);
    const mastered = Boolean(ls && ls.assessmentCount > 0 && ls.demonstratedCompetence >= 75);
    const hrs = mastered ? 0 : sk.estimatedHours;

    if (targetSet.has(id)) {
      targetHours += hrs;
    } else {
      prerequisiteHours += hrs;
      if (!mastered) missingPrerequisiteIds.push(id);
    }
    if (!mastered) {
      skillsNeedingDiagnostic.push(id);
    }
    const bp = registry.getBlueprintForSkill(id);
    for (const m of bp?.supportedQuestionTypes ?? sk.recommendedActivityTypes ?? []) {
      modesSet.add(m);
    }
  }

  const totalHours = prerequisiteHours + targetHours;
  const estimatedWeeks = totalHours > 0 ? Math.max(1, Math.ceil(totalHours / weeklyHours)) : 0;

  return {
    scope: {
      totalHours,
      prerequisiteHours,
      targetHours,
      weeklyCommitmentHours: weeklyHours,
      estimatedWeeks,
    },
    assessmentReq: {
      skillsNeedingDiagnostic,
      missingPrerequisiteIds,
      recommendedQuestionModes: Array.from(modesSet),
    },
  };
}

/**
 * Deterministic catalogue-based natural-language goal interpreter used whenever
 * Local Llama 3.2 is unavailable or as an explicit transparent baseline.
 * Never fabricates LLM status or defaults silently to programming.
 */
export function interpretGoalDeterministically(params: {
  rawGoalText: string;
  targetCompletionDate?: string | null;
  profile?: LearnerProfile | null;
  learnerSkills?: LearnerSkill[];
  registry?: DomainRegistry;
  todayISO?: string;
}): StructuredGoalInterpretation {
  const {
    rawGoalText,
    targetCompletionDate = null,
    profile = null,
    learnerSkills = [],
    registry = defaultDomainRegistry,
    todayISO = new Date().toISOString().slice(0, 10),
  } = params;

  const clean = rawGoalText.trim();
  const normalized = normalizeText(clean);
  const domains = registry.listDomains();
  const allSkills = registry.getAllSkills();
  const missingInformation: string[] = [];

  if (normalized.length < 4 || /^(learn|study|help|something|anything|course)$/.test(normalized)) {
    missingInformation.push(
      'Goal description is too broad. Specify a subject, exam, skill, or field (e.g., Business Accounting, GATE ECE, Physics, Python, Graphic Design).',
    );
    return {
      title: clean || 'Clarification Needed',
      domainId: null,
      domainName: 'Unspecified Domain',
      category: 'custom',
      subjectId: null,
      subjectName: 'Unspecified Subject',
      targetSkillIds: [],
      targetSkillNames: [],
      structuredObjectives: [],
      currentKnowledgeAssumptions: ['No verifiable baseline yet; clarification required before generating objectives.'],
      expectedProficiencyLevel: inferProficiency(clean),
      learningPurpose: inferPurpose(clean),
      horizon: 'short_term',
      targetCompletionDate,
      estimatedLearningScope: computeScopeFromSkills({
        targetSkillIds: [],
        learnerSkills,
        profile,
        registry,
      }).scope,
      requiredAssessmentInformation: {
        skillsNeedingDiagnostic: [],
        missingPrerequisiteIds: [],
        recommendedQuestionModes: [],
      },
      missingInformation,
      clarificationNeeded: true,
      interpretationSource: 'deterministic_fallback',
      rationale: 'Deterministic interpreter detected an ambiguous goal and avoided inventing skills or objectives.',
    };
  }

  // Score domains by keyword + domain name overlap
  const scoredDomains = domains
    .map((dom) => {
      let score = 0;
      const domLower = dom.name.toLowerCase();
      if (normalized.includes(domLower)) score += 6;
      for (const word of domLower.split(/\s+/)) {
        if (word.length >= 4 && normalized.includes(word)) score += 2;
      }
      const mapping = DOMAIN_KEYWORD_MAP.find((m) => m.domainId === dom.id);
      if (mapping) {
        for (const kw of mapping.keywords) {
          if (normalized.includes(kw)) score += kw.includes(' ') ? 5 : 3;
        }
      }
      return { dom, score, defaultKind: mapping?.defaultKind };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  // Score skills directly
  const scoredSkills = allSkills
    .map((sk) => {
      let score = 0;
      const skWords = `${sk.name} ${sk.slug.replace(/-/g, ' ')} ${sk.description}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4);
      const uniqueWords = Array.from(new Set(skWords));
      for (const w of uniqueWords) {
        if (normalized.includes(w)) score += 2;
      }
      if (normalized.includes(sk.slug.replace(/-/g, ' '))) score += 5;
      return { skill: sk, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const primaryDomainEntry = scoredDomains[0] ?? null;
  let matchedDomain: DomainDefinition | null = primaryDomainEntry?.dom ?? null;

  let matchedSkills: Skill[] = scoredSkills.slice(0, 4).map((s) => s.skill);
  if (matchedSkills.length === 0 && matchedDomain) {
    matchedSkills = allSkills.filter((s) => s.domainId === matchedDomain!.id);
  }
  if (!matchedDomain && matchedSkills[0]?.domainId) {
    matchedDomain = domains.find((d) => d.id === matchedSkills[0]!.domainId) ?? null;
  }

  // Handle cross-domain match ambiguity when learner explicitly wrote unrelated terms with low tie confidence
  const hasCompetingTopDomains =
    scoredDomains.length >= 2 &&
    scoredDomains[1]!.score >= scoredDomains[0]!.score &&
    scoredSkills.length === 0;

  if (!matchedDomain && matchedSkills.length === 0) {
    missingInformation.push(
      'Could not match this text automatically to an existing bundled domain. Pick a domain from the 30-domain registry or add custom target skills.',
    );
  } else if (matchedDomain && matchedSkills.length === 0) {
    missingInformation.push(
      `"${matchedDomain.name}" currently has status "${matchedDomain.contentStatus}" with no bundled skills yet. Confirm your custom focus skills or subtopics to create a roadmap.`,
    );
  }
  if (hasCompetingTopDomains) {
    missingInformation.push(
      `Goal matches multiple domains (${scoredDomains[0]!.dom.name} and ${scoredDomains[1]!.dom.name}). Clarify primary focus or split into two separate goals.`,
    );
  }

  const purpose = inferPurpose(clean, primaryDomainEntry?.defaultKind);
  if (purpose === 'examination' && !targetCompletionDate) {
    missingInformation.push('Target examination date is not set; add a target date to enable realistic pacing checks.');
  }

  const targetSkillIds = matchedSkills.map((s) => s.id);
  const subjects = matchedDomain ? registry.listSubjectsByDomain(matchedDomain.id) : [];
  const subject =
    subjects.find((sub) => matchedSkills.some((sk) => sk.subjectId === sub.id)) ?? subjects[0] ?? null;

  const { scope, assessmentReq } = computeScopeFromSkills({
    targetSkillIds,
    learnerSkills,
    profile,
    registry,
  });

  const assumptions: string[] = [];
  const unassessedCount = targetSkillIds.filter((id) => {
    const ls = learnerSkills.find((x) => x.skillId === id);
    return !ls || ls.assessmentCount === 0;
  }).length;
  if (unassessedCount > 0) {
    assumptions.push(
      `${unassessedCount} target skill(s) have no verified assessment yet and require a baseline diagnostic.`,
    );
  }
  if (/beginner|scratch|new to|from basics/.test(normalized)) {
    assumptions.push('Learner self-identified as starting from foundational concepts.');
  }
  if (assumptions.length === 0) {
    assumptions.push('Readiness will be verified against prerequisite checkpoints before advancing.');
  }

  const objectives =
    matchedSkills.length > 0
      ? matchedSkills.map((s) => `Master ${s.name}`)
      : matchedDomain
        ? [`Define custom milestones inside ${matchedDomain.name}`, 'Assess baseline mastery before scheduling practice']
        : [];

  const title =
    clean.length <= 72
      ? clean.replace(/^[a-z]/, (c) => c.toUpperCase())
      : matchedDomain
        ? `${matchedDomain.name} Learning Plan`
        : `${clean.slice(0, 68)}...`;

  return {
    title,
    domainId: matchedDomain?.id ?? null,
    domainName: matchedDomain?.name ?? 'Custom / Unmapped Domain',
    category: matchedDomain?.id ?? 'custom',
    subjectId: subject?.id ?? null,
    subjectName: subject?.name ?? (matchedDomain ? `${matchedDomain.name} Core` : 'Custom Subject'),
    targetSkillIds,
    targetSkillNames: matchedSkills.map((s) => s.name),
    structuredObjectives: objectives,
    currentKnowledgeAssumptions: assumptions,
    expectedProficiencyLevel: inferProficiency(clean),
    learningPurpose: purpose,
    horizon: inferHorizon(targetCompletionDate, scope.estimatedWeeks, todayISO),
    targetCompletionDate,
    estimatedLearningScope: scope,
    requiredAssessmentInformation: assessmentReq,
    missingInformation,
    clarificationNeeded: matchedSkills.length === 0 || hasCompetingTopDomains,
    interpretationSource: 'deterministic_fallback',
    rationale: matchedDomain
      ? `Matched deterministically against Universal Domain Registry ("${matchedDomain.name}", status: ${matchedDomain.contentStatus}) using catalogue keywords and prerequisite DAG.`
      : 'Deterministic fallback could not map text directly to a bundled domain; clarification requested.',
  };
}

/**
 * Combines schema-validated local Llama 3.2 output with Universal Domain Registry
 * skill graph scope and prerequisite verification.
 */
export function mergeLlamaGoalInterpretation(params: {
  rawGoalText: string;
  llamaOutput: {
    normalizedTitle: string;
    suggestedCategory: string;
    structuredObjectives: string[];
    recommendedSkillSlugs: string[];
    rationale: string;
    domainName?: string;
    subjectName?: string;
    expectedProficiency?: DifficultyLevel;
    learningPurpose?: string;
    currentKnowledgeAssumptions?: string[];
    missingInformation?: string[];
  };
  targetCompletionDate?: string | null;
  profile?: LearnerProfile | null;
  learnerSkills?: LearnerSkill[];
  registry?: DomainRegistry;
  todayISO?: string;
}): StructuredGoalInterpretation {
  const {
    rawGoalText,
    llamaOutput,
    targetCompletionDate = null,
    profile = null,
    learnerSkills = [],
    registry = defaultDomainRegistry,
    todayISO = new Date().toISOString().slice(0, 10),
  } = params;

  const allSkills = registry.getAllSkills();
  const matchedSkills = allSkills.filter(
    (s) =>
      llamaOutput.recommendedSkillSlugs.includes(s.slug) ||
      llamaOutput.recommendedSkillSlugs.includes(s.id),
  );
  const domains = registry.listDomains();
  const primaryDomain =
    domains.find((d) => d.id === matchedSkills[0]?.domainId) ??
    domains.find((d) => d.name.toLowerCase() === llamaOutput.domainName?.toLowerCase()) ??
    null;
  const subjects = primaryDomain ? registry.listSubjectsByDomain(primaryDomain.id) : [];
  const primarySubject =
    subjects.find((s) => s.id === matchedSkills[0]?.subjectId) ?? subjects[0] ?? null;

  const targetSkillIds = matchedSkills.map((s) => s.id);
  const { scope, assessmentReq } = computeScopeFromSkills({
    targetSkillIds,
    learnerSkills,
    profile,
    registry,
  });

  const missingInfo = [...(llamaOutput.missingInformation ?? [])];
  if (targetSkillIds.length === 0) {
    missingInfo.push('No catalog skills matched Llama recommendations; select focus skills in the Domain Explorer.');
  }

  return {
    title: llamaOutput.normalizedTitle,
    domainId: primaryDomain?.id ?? null,
    domainName: primaryDomain?.name ?? llamaOutput.domainName ?? 'Custom Domain',
    category: llamaOutput.suggestedCategory,
    subjectId: primarySubject?.id ?? null,
    subjectName: primarySubject?.name ?? llamaOutput.subjectName ?? 'Custom Subject',
    targetSkillIds,
    targetSkillNames: matchedSkills.map((s) => s.name),
    structuredObjectives: llamaOutput.structuredObjectives,
    currentKnowledgeAssumptions:
      llamaOutput.currentKnowledgeAssumptions?.length
        ? llamaOutput.currentKnowledgeAssumptions
        : ['Verify baseline skills with a diagnostic assessment.'],
    expectedProficiencyLevel: llamaOutput.expectedProficiency ?? inferProficiency(rawGoalText),
    learningPurpose: inferPurpose(`${llamaOutput.learningPurpose ?? ''} ${rawGoalText}`),
    horizon: inferHorizon(targetCompletionDate, scope.estimatedWeeks, todayISO),
    targetCompletionDate,
    estimatedLearningScope: scope,
    requiredAssessmentInformation: assessmentReq,
    missingInformation: missingInfo,
    clarificationNeeded: targetSkillIds.length === 0 || missingInfo.length > 0,
    interpretationSource: 'llm_local',
    rationale: llamaOutput.rationale,
  };
}

/**
 * Validates goal inputs against domain registry, date calendar validity, deadlines,
 * duplicate active goals, and prerequisite dependencies.
 */
export function validateLearningGoalInput(params: {
  title: string;
  domainId?: string;
  targetSkillIds: string[];
  targetCompletionDate?: string | null;
  existingGoals: LearningGoal[];
  editingGoalId?: string;
  profile?: LearnerProfile | null;
  learnerSkills?: LearnerSkill[];
  registry?: DomainRegistry;
  todayISO?: string;
}): GoalValidationResult {
  const {
    title,
    domainId,
    targetSkillIds,
    targetCompletionDate = null,
    existingGoals,
    editingGoalId,
    profile = null,
    learnerSkills = [],
    registry = defaultDomainRegistry,
    todayISO = new Date().toISOString().slice(0, 10),
  } = params;

  const errors: string[] = [];
  const warnings: string[] = [];
  const clarificationQuestions: string[] = [];
  const cleanTitle = title.trim();

  if (cleanTitle.length < 3) {
    errors.push('Goal title cannot be empty and must be at least 3 characters.');
    clarificationQuestions.push('What subject, exam, or practical skill would you like to achieve?');
  }

  const allDomains = registry.listDomains();
  if (domainId && !allDomains.some((d) => d.id === domainId)) {
    errors.push(`Unknown domain "${domainId}". Choose an existing domain or register a custom domain bundle first.`);
  }

  const allSkills = registry.getAllSkills();
  const knownSkillIds = new Set(allSkills.map((s) => s.id));
  const unknownSkillIds = targetSkillIds.filter((id) => !knownSkillIds.has(id));
  if (unknownSkillIds.length > 0) {
    errors.push(`Unsupported skill identifiers: ${unknownSkillIds.join(', ')}.`);
  }

  if (targetSkillIds.length === 0) {
    errors.push('At least one target skill must be selected for this goal.');
    clarificationQuestions.push('Select one or more target skills or subjects so prerequisite gaps can be analyzed.');
  }

  const duplicate = existingGoals.find((g) => {
    if (g.id === editingGoalId) return false;
    const status = g.status ?? (g.isActive ? 'active' : 'paused');
    if (status === 'archived') return false;
    return normalizeText(g.title) === normalizeText(cleanTitle);
  });
  if (duplicate) {
    errors.push(`An active or paused goal titled "${duplicate.title}" already exists.`);
  }

  let isDeadlineUnrealistic = false;
  if (targetCompletionDate) {
    if (!isValidIsoCalendarDate(targetCompletionDate)) {
      errors.push(`Invalid target date "${targetCompletionDate}". Expected valid YYYY-MM-DD calendar date.`);
    } else {
      const daysLeft = daysBetweenISO(todayISO, targetCompletionDate);
      if (daysLeft <= 0) {
        errors.push(`Target date "${targetCompletionDate}" must be after today (${todayISO}).`);
      } else if (unknownSkillIds.length === 0 && targetSkillIds.length > 0) {
        const { scope } = computeScopeFromSkills({
          targetSkillIds,
          learnerSkills,
          profile,
          registry,
        });
        const weeklyHours = scope.weeklyCommitmentHours;
        const availableCapacityHours = Number(((daysLeft / 7) * weeklyHours).toFixed(1));
        if (scope.totalHours > availableCapacityHours) {
          isDeadlineUnrealistic = true;
          warnings.push(
            `Deadline tight: target requires ~${scope.totalHours}h while current schedule (${weeklyHours}h/wk) yields ~${availableCapacityHours}h before ${targetCompletionDate}.`,
          );
        }
      }
    }
  }

  const validTargets = targetSkillIds.filter((id) => knownSkillIds.has(id));
  const missingPrerequisiteIds =
    validTargets.length > 0
      ? computeScopeFromSkills({ targetSkillIds: validTargets, learnerSkills, profile, registry })
          .assessmentReq.missingPrerequisiteIds
      : [];

  if (missingPrerequisiteIds.length > 0) {
    warnings.push(
      `Includes ${missingPrerequisiteIds.length} unmastered prerequisite skill(s) that must be scheduled before advanced targets.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    clarificationQuestions,
    missingPrerequisiteIds,
    unknownSkillIds,
    duplicateGoalId: duplicate?.id ?? null,
    isDeadlineUnrealistic,
  };
}

export function createLearningGoal(params: {
  id?: string;
  learnerId: string;
  category: string;
  domainId?: string;
  subjectId?: string;
  title: string;
  rawDescription: string;
  structuredObjectives: string[];
  targetSkillIds: string[];
  interpretedByAI: boolean;
  interpretationMode?: LearningGoal['interpretationMode'];
  priority?: GoalPriority;
  horizon?: GoalHorizon;
  goalKind?: GoalKind;
  targetCompletionDate?: string | null;
  expectedProficiency?: DifficultyLevel;
  learningPurpose?: string;
  profile?: LearnerProfile | null;
  learnerSkills?: LearnerSkill[];
  registry?: DomainRegistry;
  now?: string;
}): LearningGoal {
  const now = params.now ?? new Date().toISOString();
  const registry = params.registry ?? defaultDomainRegistry;
  const { scope } = computeScopeFromSkills({
    targetSkillIds: params.targetSkillIds,
    learnerSkills: params.learnerSkills ?? [],
    profile: params.profile ?? null,
    registry,
  });

  const historyEntry: GoalHistoryEntry = {
    timestamp: now,
    changedFields: ['created'],
    note: `Created goal (${params.interpretationMode ?? (params.interpretedByAI ? 'llm_local' : 'manual')})`,
  };

  return {
    id: params.id ?? `goal_${Date.now()}`,
    learnerId: params.learnerId,
    category: params.category,
    domainId: params.domainId,
    subjectId: params.subjectId,
    title: params.title.trim(),
    rawDescription: params.rawDescription.trim(),
    structuredObjectives: params.structuredObjectives,
    targetSkillIds: params.targetSkillIds,
    interpretedByAI: params.interpretedByAI,
    interpretationMode: params.interpretationMode ?? (params.interpretedByAI ? 'llm_local' : 'manual'),
    status: 'active',
    priority: params.priority ?? 'medium',
    horizon:
      params.horizon ??
      inferHorizon(params.targetCompletionDate ?? null, scope.estimatedWeeks, now.slice(0, 10)),
    goalKind: params.goalKind ?? inferPurpose(params.rawDescription || params.title),
    targetCompletionDate: params.targetCompletionDate ?? null,
    expectedProficiency: params.expectedProficiency ?? inferProficiency(params.title),
    learningPurpose: params.learningPurpose,
    estimatedScopeHours: scope.totalHours,
    history: [historyEntry],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateLearningGoal(
  goal: LearningGoal,
  patch: Partial<
    Pick<
      LearningGoal,
      | 'title'
      | 'rawDescription'
      | 'structuredObjectives'
      | 'targetSkillIds'
      | 'priority'
      | 'horizon'
      | 'goalKind'
      | 'targetCompletionDate'
      | 'expectedProficiency'
      | 'learningPurpose'
    >
  >,
  note?: string,
  now = new Date().toISOString(),
): LearningGoal {
  const changedFields: string[] = [];
  if (patch.title !== undefined && patch.title !== goal.title) changedFields.push('title');
  if (patch.rawDescription !== undefined && patch.rawDescription !== goal.rawDescription) {
    changedFields.push('rawDescription');
  }
  if (patch.priority !== undefined && patch.priority !== goal.priority) changedFields.push('priority');
  if (patch.targetCompletionDate !== undefined && patch.targetCompletionDate !== goal.targetCompletionDate) {
    changedFields.push('targetCompletionDate');
  }
  if (patch.targetSkillIds !== undefined) changedFields.push('targetSkillIds');
  if (patch.horizon !== undefined && patch.horizon !== goal.horizon) changedFields.push('horizon');
  if (patch.goalKind !== undefined && patch.goalKind !== goal.goalKind) changedFields.push('goalKind');

  const historyEntry: GoalHistoryEntry = {
    timestamp: now,
    changedFields: changedFields.length > 0 ? changedFields : ['updated'],
    note: note?.trim() || `Updated goal (${changedFields.join(', ') || 'metadata'})`,
  };

  return {
    ...goal,
    ...patch,
    title: (patch.title ?? goal.title).trim(),
    history: [...(goal.history ?? []), historyEntry],
    updatedAt: now,
  };
}

export function transitionGoalStatus(
  goal: LearningGoal,
  nextStatus: GoalLifecycleStatus,
  note?: string,
  now = new Date().toISOString(),
): LearningGoal {
  const historyEntry: GoalHistoryEntry = {
    timestamp: now,
    changedFields: ['status'],
    note: note?.trim() || `Changed status to ${nextStatus}`,
  };
  return {
    ...goal,
    status: nextStatus,
    isActive: nextStatus === 'active',
    history: [...(goal.history ?? []), historyEntry],
    updatedAt: now,
  };
}

export function setGoalPriority(
  goal: LearningGoal,
  priority: GoalPriority,
  note?: string,
  now = new Date().toISOString(),
): LearningGoal {
  return updateLearningGoal(
    goal,
    { priority },
    note ?? `Priority changed to ${priority}`,
    now,
  );
}

/**
 * Prioritizes multiple simultaneous active goals and allocates weekly study hours
 * strictly bounded by the learner's available study budget (`availableHoursPerDay * studyDaysPerWeek`).
 */
export function prioritizeAndAllocateGoals(params: {
  goals: LearningGoal[];
  profile: LearnerProfile | null;
  learnerSkills: LearnerSkill[];
  existingSchedules?: StudySchedule[];
  registry?: DomainRegistry;
  todayISO?: string;
}): MultiGoalPrioritizationReport {
  const {
    goals,
    profile,
    learnerSkills,
    existingSchedules = [],
    registry = defaultDomainRegistry,
    todayISO = new Date().toISOString().slice(0, 10),
  } = params;

  const weeklyCapacityHours = Number(
    Math.max(1, (profile?.availableHoursPerDay ?? 2) * (profile?.studyDaysPerWeek ?? 5)).toFixed(1),
  );

  const activeGoals = goals.filter((g) => (g.status ? g.status === 'active' : g.isActive));
  if (activeGoals.length === 0) {
    return {
      weeklyCapacityHours,
      totalRequestedHoursPerWeek: 0,
      totalAllocatedWeeklyHours: 0,
      exceedsCapacity: false,
      overloadWarning: null,
      allocations: [],
    };
  }

  const priorityWeight: Record<GoalPriority, number> = { high: 3, medium: 2, low: 1 };

  const scored = activeGoals.map((goal) => {
    const prio: GoalPriority = goal.priority ?? 'medium';
    const baseWeight = priorityWeight[prio];
    const { scope, assessmentReq } = computeScopeFromSkills({
      targetSkillIds: goal.targetSkillIds,
      learnerSkills,
      profile,
      registry,
    });

    const schedForGoal = existingSchedules.find((s) => s.pathId === `path_${goal.id}`);
    const remainingHours = Math.max(2, scope.totalHours || schedForGoal?.totalPlannedHours || 10);

    let urgencyBonus = 0;
    let deadlineWarning: string | null = null;
    let desiredWeeklyHours = Math.min(remainingHours, Math.max(2, Math.round(remainingHours / 6)));

    if (goal.targetCompletionDate && isValidIsoCalendarDate(goal.targetCompletionDate)) {
      const daysLeft = daysBetweenISO(todayISO, goal.targetCompletionDate);
      if (daysLeft <= 0) {
        urgencyBonus = 2.5;
        desiredWeeklyHours = remainingHours;
        deadlineWarning = 'Target completion date has passed or is due today.';
      } else {
        const weeksLeft = Math.max(1, daysLeft / 7);
        desiredWeeklyHours = Math.ceil(remainingHours / weeksLeft);
        if (daysLeft <= 30) urgencyBonus = 2;
        else if (daysLeft <= 90) urgencyBonus = 1;
      }
    }

    const prereqReadyBonus = assessmentReq.missingPrerequisiteIds.length === 0 ? 0.5 : 0;
    const priorityScore = Number((baseWeight * 10 + urgencyBonus * 5 + prereqReadyBonus).toFixed(1));

    return {
      goal,
      priority: prio,
      priorityScore,
      remainingHours,
      desiredWeeklyHours,
      missingPrerequisiteIds: assessmentReq.missingPrerequisiteIds,
      deadlineWarning,
    };
  });

  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  const totalRequestedHoursPerWeek = Number(
    scored.reduce((acc, s) => acc + s.desiredWeeklyHours, 0).toFixed(1),
  );
  const totalScores = scored.reduce((acc, s) => acc + s.priorityScore, 0);

  // Allocate strictly within weeklyCapacityHours (never exceeding available study time)
  let remainingBudget = weeklyCapacityHours;
  const allocations: GoalWorkloadAllocation[] = scored.map((item, idx) => {
    let rawShare =
      idx === scored.length - 1
        ? remainingBudget
        : Number(((item.priorityScore / totalScores) * weeklyCapacityHours).toFixed(1));
    rawShare = Math.max(0, Math.min(remainingBudget, rawShare));
    remainingBudget = Number(Math.max(0, remainingBudget - rawShare).toFixed(1));

    const effectiveWeekly = rawShare;
    const estimatedWeeks =
      effectiveWeekly > 0 ? Math.ceil(item.remainingHours / effectiveWeekly) : 999;

    const warning =
      item.deadlineWarning ??
      (item.desiredWeeklyHours > effectiveWeekly
        ? `Desired ${item.desiredWeeklyHours}h/wk trimmed to ${effectiveWeekly}h/wk to fit ${weeklyCapacityHours}h/wk budget.`
        : null);

    return {
      goalId: item.goal.id,
      title: item.goal.title,
      priority: item.priority,
      priorityScore: item.priorityScore,
      remainingHours: item.remainingHours,
      allocatedWeeklyHours: effectiveWeekly,
      estimatedWeeksAtAllocation: estimatedWeeks,
      missingPrerequisiteIds: item.missingPrerequisiteIds,
      deadlineWarning: warning,
      recommendedFocus:
        item.missingPrerequisiteIds.length > 0
          ? `Clear ${item.missingPrerequisiteIds.length} prerequisite gap(s) first`
          : 'Advance active roadmap milestones',
    };
  });

  const totalAllocatedWeeklyHours = Number(
    allocations.reduce((sum, a) => sum + a.allocatedWeeklyHours, 0).toFixed(1),
  );
  const exceedsCapacity = totalRequestedHoursPerWeek > weeklyCapacityHours;

  return {
    weeklyCapacityHours,
    totalRequestedHoursPerWeek,
    totalAllocatedWeeklyHours,
    exceedsCapacity,
    overloadWarning: exceedsCapacity
      ? `Combined active goals demand ~${totalRequestedHoursPerWeek}h/wk vs ${weeklyCapacityHours}h/wk budget. Allocations were capped cleanly to prevent overload; consider pausing a lower-priority goal or extending deadlines.`
      : null,
    allocations,
  };
}
