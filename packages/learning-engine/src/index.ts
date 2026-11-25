import type {
  ActivityKind,
  CompletionStatus,
  GoalCategory,
  LearnerProfile,
  LearnerSkill,
  LearningActivity,
  LearningGoal,
  LearningMilestone,
  LearningPath,
  LearningResource,
  LearningStage,
  Skill,
  SkillPrerequisite,
} from '@alc/shared-types';
import { SkillGraph } from '@alc/skill-graph';
import {
  defaultDomainRegistry,
  DomainRegistry,
  UNIVERSAL_PREREQUISITES,
  UNIVERSAL_SKILLS,
} from './universal-catalog';

export * from './universal-catalog';
export * from './learner-profile';
export * from './goal-management';
export * from './roadmap-adaptive';

export const CORE_SKILLS: Skill[] = UNIVERSAL_SKILLS;
export const CORE_PREREQUISITES: SkillPrerequisite[] = UNIVERSAL_PREREQUISITES;

export interface GoalTemplate {
  category: GoalCategory;
  domainId?: string;
  title: string;
  description: string;
  defaultObjectives: string[];
  targetSkillIds: string[];
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    category: 'gate_ece',
    domainId: 'dom_ece',
    title: 'GATE ECE Preparation',
    description: 'Master Network Theory, Signals & Systems, Analog/Digital Electronics, Control, and Communications.',
    defaultObjectives: ['Build circuit & transform foundations', 'Solve GATE-level numerical problems', 'Verify readiness through timed mocks'],
    targetSkillIds: ['ece-network-theory', 'ece-signals-systems', 'ece-analog-digital', 'ece-control-comm'],
  },
  {
    category: 'physics_mastery',
    domainId: 'dom_physics_chem',
    title: 'Physics (Mechanics to Quantum)',
    description: 'Build rigorous mathematical physics, Newtonian mechanics, electromagnetism, and quantum foundations.',
    defaultObjectives: ['Strengthen vector calculus and differential equations', 'Solve numerical & derivation problems', 'Progress sequentially to quantum foundations'],
    targetSkillIds: ['phys-math-methods', 'phys-mechanics', 'phys-electromagnetism', 'phys-quantum-intro'],
  },
  {
    category: 'business_accounting',
    domainId: 'dom_accounting',
    title: 'Business Accounting & Finance',
    description: 'Master double-entry bookkeeping, financial statements, ratio analysis, and cost budgeting.',
    defaultObjectives: ['Master debits, credits, and trial balances', 'Analyze income, balance sheet, and cash flows', 'Apply break-even and variance case studies'],
    targetSkillIds: ['acct-basics', 'acct-statements', 'acct-cost-managerial'],
  },
  {
    category: 'competitive_exam',
    domainId: 'dom_competitive_exams',
    title: 'Competitive Examination Preparation',
    description: 'Build speed, quantitative accuracy, verbal comprehension, and analytical rigor under timed constraints.',
    defaultObjectives: ['Close quantitative and logical reasoning gaps', 'Strengthen analytical reading with flashcards', 'Sustain timed mock review cycles'],
    targetSkillIds: ['exam-quant-reasoning', 'exam-verbal-comprehension', 'exam-strategy'],
  },
  {
    category: 'python_developer',
    domainId: 'dom_programming',
    title: 'Python Programming',
    description: 'Develop clean, tested Python software, automation scripts, and data tooling.',
    defaultObjectives: ['Master Pythonic data structures and OOP', 'Apply algorithms and testing workflows', 'Build tested domain applications'],
    targetSkillIds: ['prog-fundamentals', 'git-cli', 'python-core', 'dsa-algorithms'],
  },
  {
    category: 'full_stack_developer',
    domainId: 'dom_programming',
    title: 'Full Stack Developer',
    description: 'Build end-to-end typed web applications with relational storage and REST APIs.',
    defaultObjectives: ['Master TypeScript & React UI architecture', 'Design normalized SQL databases and APIs', 'Ship tested, accessible applications'],
    targetSkillIds: ['prog-fundamentals', 'git-cli', 'html-css', 'js-ts', 'react-ui', 'sql-databases', 'node-apis'],
  },
  {
    category: 'frontend_developer',
    domainId: 'dom_programming',
    title: 'Frontend Developer',
    description: 'Craft responsive, accessible, high-performance UI interfaces.',
    defaultObjectives: ['Build semantic accessible layouts', 'Master TypeScript and React state patterns', 'Optimize offline web UX'],
    targetSkillIds: ['prog-fundamentals', 'git-cli', 'html-css', 'js-ts', 'react-ui'],
  },
  {
    category: 'backend_developer',
    domainId: 'dom_programming',
    title: 'Backend Developer',
    description: 'Architect reliable APIs, relational data models, and secure server-side systems.',
    defaultObjectives: ['Master Node.js/TypeScript APIs', 'Design SQL schemas and migrations', 'Implement input validation and security hardening'],
    targetSkillIds: ['prog-fundamentals', 'git-cli', 'js-ts', 'sql-databases', 'node-apis', 'cyber-networking'],
  },
  {
    category: 'ai_engineer',
    domainId: 'dom_ai_ml',
    title: 'Artificial Intelligence Engineer',
    description: 'Build, evaluate, quantize, and deploy local LLM and intelligent systems.',
    defaultObjectives: ['Strengthen Python and math foundations', 'Master machine learning and neural architectures', 'Deploy quantized Llama models locally'],
    targetSkillIds: ['prog-fundamentals', 'python-core', 'math-linear-prob', 'ml-foundations', 'deep-learning-llm'],
  },
  {
    category: 'data_scientist',
    domainId: 'dom_data_science',
    title: 'Data Scientist',
    description: 'Turn raw datasets into statistically sound insights and predictive models.',
    defaultObjectives: ['Analyze datasets with Python and SQL', 'Apply probability and statistical inference', 'Train and validate predictive models'],
    targetSkillIds: ['prog-fundamentals', 'python-core', 'sql-databases', 'math-linear-prob', 'data-analysis', 'ml-foundations'],
  },
  {
    category: 'ml_engineer',
    domainId: 'dom_ai_ml',
    title: 'Machine Learning Engineer',
    description: 'Engineer reproducible training pipelines and optimized model inference.',
    defaultObjectives: ['Master ML algorithms and evaluation', 'Build scalable Python & DSA pipelines', 'Optimize models for production inference'],
    targetSkillIds: ['prog-fundamentals', 'python-core', 'dsa-algorithms', 'math-linear-prob', 'ml-foundations', 'deep-learning-llm'],
  },
  {
    category: 'cybersecurity_professional',
    domainId: 'dom_cybersecurity',
    title: 'Cybersecurity Professional',
    description: 'Defend applications and networks through threat modeling, auditing, and secure engineering.',
    defaultObjectives: ['Understand TCP/IP, TLS, and network security', 'Audit apps against OWASP risks', 'Implement defensive cryptography and validation'],
    targetSkillIds: ['prog-fundamentals', 'git-cli', 'js-ts', 'node-apis', 'cyber-networking', 'cyber-appsec'],
  },
  {
    category: 'gate_preparation',
    domainId: 'dom_cs_it',
    title: 'GATE Preparation (CS / DA)',
    description: 'Master core Computer Science theory, algorithms, OS, DBMS, and quantitative aptitude.',
    defaultObjectives: ['Master Data Structures & Algorithms', 'Cover OS, DBMS, Networks, and Math', 'Solve timed GATE-level mock assessments'],
    targetSkillIds: ['exam-quant-reasoning', 'exam-strategy', 'prog-fundamentals', 'math-linear-prob', 'dsa-algorithms', 'sql-databases', 'cs-systems-gate'],
  },
  {
    category: 'academic_learning',
    domainId: 'dom_research',
    title: 'Academic Learning',
    description: 'Strengthen coursework in any discipline with structured milestones and active recall.',
    defaultObjectives: ['Build strong theoretical foundations', 'Reinforce lectures with domain assessments', 'Prepare ahead of term evaluations'],
    targetSkillIds: ['math-linear-prob', 'exam-verbal-comprehension', 'exam-strategy'],
  },
  {
    category: 'professional_certification',
    domainId: 'dom_prof_dev',
    title: 'Professional Certifications',
    description: 'Prepare systematically for industry certifications across business, technical, or regulatory domains.',
    defaultObjectives: ['Map exam blueprint to verified skill gaps', 'Complete applied exercises and case studies', 'Pass readiness checkpoints above 75%'],
    targetSkillIds: ['acct-basics', 'cyber-networking', 'exam-strategy'],
  },
  {
    category: 'graphic_design',
    domainId: 'dom_design',
    title: 'Graphic Design & Visual Systems',
    description: 'Develop typographic craft, composition grids, contrast discipline, and portfolio critiques.',
    defaultObjectives: ['Master readable typographic scales', 'Apply grid hierarchy & whitespace balance', 'Complete critique-driven practical layouts'],
    targetSkillIds: ['design-typography', 'design-layout-hierarchy'],
  },
  {
    category: 'custom',
    title: 'Custom Learning Goal',
    description: 'Define your own personalized objective across any domain, interpreted locally by Llama 3.2.',
    defaultObjectives: ['Translate custom goal into measurable skills', 'Diagnose current baseline competence', 'Follow an adaptive prerequisite-safe roadmap'],
    targetSkillIds: [],
  },
];

export interface DependencyChainSummary {
  targetSkillId: string;
  chainSkillIds: string[];
  missingCount: number;
  weakCount: number;
  unassessedCount: number;
  readyNow: boolean;
}

export interface ProficiencyComparisonItem {
  skillId: string;
  skillName: string;
  domain: string;
  targetPercent: number;
  demonstratedPercent: number;
  selfReportedConfidence: number;
  assessmentCount: number;
  gapPercent: number;
  ready: boolean;
  blockingIds: string[];
}

export interface SkillGapReport {
  strongSkills: Skill[];
  weakSkills: Skill[];
  missingSkills: Skill[];
  unassessedSkills: Skill[];
  recommendedNextSkills: Skill[];
  blockedSkills: Array<{ skill: Skill; blockedBy: Skill[] }>;
  topologicalOrder: Skill[];
  hasCycle: boolean;
  cyclePath: string[];
  danglingEdges: SkillPrerequisite[];
  prerequisiteEdges: SkillPrerequisite[];
  dependencyChains: DependencyChainSummary[];
  unlockImpactMap: Record<string, string[]>;
  proficiencyComparisons: ProficiencyComparisonItem[];
}

export function analyzeSkillGap(params: {
  targetSkillIds: string[];
  learnerSkills: LearnerSkill[];
  skills?: Skill[];
  prerequisites?: SkillPrerequisite[];
  registry?: DomainRegistry;
  targetProficiencyPercent?: number;
  prerequisiteThresholdPercent?: number;
}): SkillGapReport {
  const registry = params.registry ?? defaultDomainRegistry;
  const skills = params.skills ?? registry.getAllSkills();
  const prerequisites = params.prerequisites ?? registry.getAllPrerequisites();
  const targetThreshold = params.targetProficiencyPercent ?? 75;
  const prereqThreshold = params.prerequisiteThresholdPercent ?? 65;

  if (params.targetSkillIds.length === 0) {
    return {
      strongSkills: [],
      weakSkills: [],
      missingSkills: [],
      unassessedSkills: [],
      recommendedNextSkills: [],
      blockedSkills: [],
      topologicalOrder: [],
      hasCycle: false,
      cyclePath: [],
      danglingEdges: [],
      prerequisiteEdges: [],
      dependencyChains: [],
      unlockImpactMap: {},
      proficiencyComparisons: [],
    };
  }

  const graph = new SkillGraph(skills, prerequisites);
  const integrity = graph.validateIntegrity();
  const topo = graph.getTopologicalOrder(params.targetSkillIds);
  const subgraph = graph.getSubgraphForTargets(params.targetSkillIds);
  const skillById = new Map(skills.map((s) => [s.id, s]));
  const lsById = new Map(params.learnerSkills.map((ls) => [ls.skillId, ls]));

  const strongSkills: Skill[] = [];
  const weakSkills: Skill[] = [];
  const missingSkills: Skill[] = [];
  const unassessedSkills: Skill[] = [];
  const recommendedNextSkills: Skill[] = [];
  const blockedSkills: Array<{ skill: Skill; blockedBy: Skill[] }> = [];
  const unlockImpactMap: Record<string, string[]> = {};
  const proficiencyComparisons: ProficiencyComparisonItem[] = [];

  const topologicalSkills = topo.hasCycle
    ? []
    : topo.order.map((id) => skillById.get(id)).filter((s): s is Skill => Boolean(s));

  for (const skill of topologicalSkills) {
    const ls = lsById.get(skill.id);
    const demonstrated = ls?.assessmentCount ? ls.demonstratedCompetence : 0;
    const isMastered = Boolean(ls && ls.assessmentCount > 0 && demonstrated >= targetThreshold);

    if (!ls || ls.assessmentCount === 0) {
      unassessedSkills.push(skill);
    } else if (demonstrated >= targetThreshold) {
      strongSkills.push(skill);
    } else if (demonstrated >= 45) {
      weakSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }

    const readiness = graph.checkReadiness(skill.id, params.learnerSkills, prereqThreshold);
    if (!isMastered) {
      if (readiness.ready) {
        recommendedNextSkills.push(skill);
      } else {
        const blockers = readiness.blockingPrerequisites
          .map((id) => skillById.get(id))
          .filter((s): s is Skill => Boolean(s));
        blockedSkills.push({ skill, blockedBy: blockers });
      }
    }

    const unlockTargets = graph
      .getUnlockImpact(skill.id)
      .filter((u) => topologicalSkills.some((t) => t.id === u.id))
      .map((u) => u.id);
    unlockImpactMap[skill.id] = unlockTargets;

    proficiencyComparisons.push({
      skillId: skill.id,
      skillName: skill.name,
      domain: skill.domain,
      targetPercent: targetThreshold,
      demonstratedPercent: demonstrated,
      selfReportedConfidence: ls?.selfReportedConfidence ?? 0,
      assessmentCount: ls?.assessmentCount ?? 0,
      gapPercent: Math.max(0, targetThreshold - demonstrated),
      ready: readiness.ready,
      blockingIds: readiness.blockingPrerequisites,
    });
  }

  const dependencyChains: DependencyChainSummary[] = params.targetSkillIds.map((targetId) => {
    const chain = graph.getPrerequisiteChain(targetId).map((s) => s.id);
    let missingCount = 0;
    let weakCount = 0;
    let unassessedCount = 0;
    for (const id of chain) {
      const ls = lsById.get(id);
      if (!ls || ls.assessmentCount === 0) unassessedCount += 1;
      else if (ls.demonstratedCompetence < 45) missingCount += 1;
      else if (ls.demonstratedCompetence < targetThreshold) weakCount += 1;
    }
    const readiness = graph.checkReadiness(targetId, params.learnerSkills, prereqThreshold);
    return {
      targetSkillId: targetId,
      chainSkillIds: chain,
      missingCount,
      weakCount,
      unassessedCount,
      readyNow: readiness.ready,
    };
  });

  return {
    strongSkills,
    weakSkills,
    missingSkills,
    unassessedSkills,
    recommendedNextSkills,
    blockedSkills,
    topologicalOrder: topologicalSkills,
    hasCycle: topo.hasCycle,
    cyclePath: topo.cyclePath,
    danglingEdges: integrity.danglingEdges,
    prerequisiteEdges: subgraph.edges,
    dependencyChains,
    unlockImpactMap,
    proficiencyComparisons,
  };
}

function resolvePracticeActivityType(
  skill: Skill,
  profile: LearnerProfile | null,
): ActivityKind {
  if (profile?.preferredFormat === 'hands_on_projects') {
    if (skill.recommendedActivityTypes?.includes('coding')) return 'coding';
    if (skill.recommendedActivityTypes?.includes('case_study')) return 'case_study';
    if (skill.recommendedActivityTypes?.includes('numerical')) return 'numerical';
    return 'project';
  }
  const nonLesson = (skill.recommendedActivityTypes ?? []).find(
    (t) => t !== 'lesson' && t !== 'mcq' && t !== 'quiz',
  );
  return nonLesson ?? 'exercise';
}

function resolveAssessmentActivityType(
  skill: Skill,
  registry: DomainRegistry,
  practiceType?: ActivityKind,
): ActivityKind {
  const bp = registry.getBlueprintForSkill(skill.id);
  const modes = bp?.supportedQuestionTypes ?? [];
  const skillModes = (skill.recommendedActivityTypes ?? []).filter((m) =>
    ['mcq', 'numerical', 'case_study', 'coding', 'descriptive', 'flashcard', 'practical'].includes(m),
  );
  const orderedCandidates = Array.from(new Set([...skillModes, ...modes]));
  const distinct = orderedCandidates.find((m) => m !== practiceType);
  return distinct ?? orderedCandidates[0] ?? 'mcq';
}

export function buildPersonalizedLearningPath(params: {
  pathId: string;
  learnerId: string;
  goal: LearningGoal;
  profile: LearnerProfile | null;
  learnerSkills: LearnerSkill[];
  resources: LearningResource[];
  skills?: Skill[];
  prerequisites?: SkillPrerequisite[];
  registry?: DomainRegistry;
  previousPath?: LearningPath | null;
  allocatedWeeklyHours?: number;
  startDateISO?: string;
}): LearningPath {
  const {
    pathId,
    learnerId,
    goal,
    profile,
    learnerSkills,
    resources,
    previousPath = null,
    allocatedWeeklyHours,
    startDateISO = new Date().toISOString().slice(0, 10),
  } = params;
  const registry = params.registry ?? defaultDomainRegistry;
  const activeSkills = params.skills ?? registry.getAllSkills();
  const activePrereqs = params.prerequisites ?? registry.getAllPrerequisites();

  const combinedTargets = Array.from(
    new Set([...goal.targetSkillIds, ...(profile?.targetSkills ?? [])]),
  );
  if (combinedTargets.length === 0) {
    throw new Error('At least one target skill is required to generate a personalised roadmap.');
  }

  const targetProficiency =
    goal.expectedProficiency === 'advanced' ? 80 : goal.expectedProficiency === 'beginner' ? 65 : 75;

  const gap = analyzeSkillGap({
    targetSkillIds: combinedTargets,
    learnerSkills,
    skills: activeSkills,
    prerequisites: activePrereqs,
    registry,
    targetProficiencyPercent: targetProficiency,
    prerequisiteThresholdPercent: 65,
  });

  if (gap.hasCycle) {
    throw new Error('Cannot generate learning roadmap: prerequisite skill graph contains a cycle.');
  }

  const graph = new SkillGraph(activeSkills, activePrereqs);
  const lsMap = new Map(learnerSkills.map((ls) => [ls.skillId, ls]));
  const resBySkill = new Map<string, LearningResource[]>();
  for (const r of resources) {
    const list = resBySkill.get(r.skillId) ?? [];
    list.push(r);
    resBySkill.set(r.skillId, list);
  }

  // Index completed / in-progress activities from previousPath so learner progress is never wiped
  const prevActivitiesByKey = new Map<string, LearningActivity>();
  if (previousPath) {
    for (const st of previousPath.stages) {
      for (const m of st.milestones) {
        for (const a of m.activities) {
          if (a.status === 'completed' || a.status === 'in_progress' || (a.actualMinutes ?? 0) > 0) {
            prevActivitiesByKey.set(`${a.skillId}::${a.type}`, a);
            prevActivitiesByKey.set(a.id, a);
          }
        }
      }
    }
  }

  const stageBuckets: Array<{
    title: string;
    description: string;
    skills: Skill[];
  }> = [
    {
      title: 'Stage 1: Verified Foundations & Prerequisites',
      description: 'Close foundational gaps and verify prerequisite mastery before advancing.',
      skills: gap.topologicalOrder.filter((s) => s.difficulty === 'beginner'),
    },
    {
      title: 'Stage 2: Core Domain Competencies',
      description: 'Build domain depth using subject-matched activities, practice sets, and checkpoints.',
      skills: gap.topologicalOrder.filter((s) => s.difficulty === 'intermediate'),
    },
    {
      title: 'Stage 3: Advanced Mastery & Applied Synthesis',
      description: 'Synthesize concepts through advanced problems, case studies, or capstone projects.',
      skills: gap.topologicalOrder.filter((s) => s.difficulty === 'advanced'),
    },
  ].filter((b) => b.skills.length > 0);

  const levelMultiplier =
    profile?.academicLevel === 'high_school'
      ? 1.15
      : profile?.academicLevel === 'working_professional' || profile?.academicLevel === 'graduate'
        ? 0.9
        : 1.0;

  const preferredLang = profile?.preferredLanguage?.trim() || 'English';
  const blockedSkillIds: string[] = [];
  let preservedCompletedCount = 0;

  const restoreActivity = (act: LearningActivity): LearningActivity => {
    const prev = prevActivitiesByKey.get(`${act.skillId}::${act.type}`) ?? prevActivitiesByKey.get(act.id);
    if (!prev) return act;
    if (prev.status === 'completed') preservedCompletedCount += 1;
    return {
      ...act,
      status: prev.status,
      completedAt: prev.completedAt,
      actualMinutes: prev.actualMinutes ?? act.actualMinutes,
    };
  };

  const stages: LearningStage[] = stageBuckets.map((bucket, stageIdx) => {
    const milestones: LearningMilestone[] = bucket.skills.map((skill, mIdx) => {
      const ls = lsMap.get(skill.id);
      const isAlreadyStrong = Boolean(
        ls && ls.assessmentCount > 0 && ls.demonstratedCompetence >= Math.max(75, targetProficiency),
      );
      const readiness = graph.checkReadiness(skill.id, learnerSkills, 65);
      const readinessState: LearningMilestone['readinessState'] = isAlreadyStrong
        ? 'completed'
        : readiness.ready
          ? 'ready'
          : 'blocked';
      if (readinessState === 'blocked') {
        blockedSkillIds.push(skill.id);
      }

      const skillResources = resBySkill.get(skill.id) ?? [];
      const primaryRes = skillResources[0] ?? null;
      const contentAvailability = primaryRes?.contentStatus ?? skill.contentStatus ?? 'planned';

      const effortFactor = isAlreadyStrong
        ? 0.35
        : ls && ls.assessmentCount > 0 && ls.demonstratedCompetence >= 50
          ? 0.75
          : 1.0;
      const adjustedHours = Math.max(
        2,
        Math.round(skill.estimatedHours * effortFactor * levelMultiplier),
      );

      const milestoneId = `${pathId}_st${stageIdx + 1}_m${mIdx + 1}`;
      const preferReading = profile?.preferredFormat === 'reading';
      const preferQuizzes = profile?.preferredFormat === 'interactive_quizzes';
      const practiceType = resolvePracticeActivityType(skill, profile);
      const assessmentType = resolveAssessmentActivityType(skill, registry, practiceType);

      const masteryReason = isAlreadyStrong
        ? `Verified at ${ls?.demonstratedCompetence}% mastery; light retention review only.`
        : !ls || ls.assessmentCount === 0
          ? `Unassessed in ${skill.domain}; baseline diagnostic & guided concept mastery scheduled.`
          : `Assessed at ${ls.demonstratedCompetence}% (below ${targetProficiency}% target); prioritized remediation.`;

      const prereqNames = readiness.blockingPrerequisites
        .map((id) => activeSkills.find((s) => s.id === id)?.name ?? id);
      const readinessNote =
        readinessState === 'blocked'
          ? `Blocked until required prerequisites pass (>=65%): ${prereqNames.join(', ')}.`
          : 'Prerequisites satisfied; ready to study now.';

      const milestoneReason = `${masteryReason} ${readinessNote}`;
      const baseCompletedAt = isAlreadyStrong ? new Date().toISOString() : null;
      const baseStatus: CompletionStatus = isAlreadyStrong ? 'completed' : 'not_started';

      const rawActivities: LearningActivity[] = [
        {
          id: `${milestoneId}_a1`,
          milestoneId,
          skillId: skill.id,
          title: primaryRes ? primaryRes.title : `${skill.name}: Core Concepts (${preferredLang})`,
          type: 'lesson',
          resourceId: primaryRes?.id ?? null,
          estimatedMinutes: Math.round(adjustedHours * (preferReading ? 30 : 22)),
          actualMinutes: 0,
          reason: `Core conceptual grounding (${skill.domain}, language: ${preferredLang}).`,
          contentAvailability,
          status: baseStatus,
          completedAt: baseCompletedAt,
        },
        {
          id: `${milestoneId}_a2`,
          milestoneId,
          skillId: skill.id,
          title: `${skill.name}: Applied Practice (${practiceType.replace('_', ' ')})`,
          type: practiceType,
          resourceId: primaryRes?.id ?? null,
          estimatedMinutes: Math.round(adjustedHours * 20),
          actualMinutes: 0,
          reason: `Domain-matched ${practiceType.replace('_', ' ')} application tailored for ${profile?.preferredFormat ?? 'mixed'} format.`,
          contentAvailability,
          status: baseStatus,
          completedAt: baseCompletedAt,
        },
        {
          id: `${milestoneId}_a3`,
          milestoneId,
          skillId: skill.id,
          title: `${skill.name}: Spaced Recall & Revision`,
          type: (skill.recommendedActivityTypes ?? []).includes('flashcard') ? 'flashcard' : 'revision',
          resourceId: null,
          estimatedMinutes: Math.max(15, Math.round(adjustedHours * 8)),
          actualMinutes: 0,
          reason: 'Reinforces long-term memory retention and fixes early mistakes.',
          contentAvailability,
          status: baseStatus,
          completedAt: baseCompletedAt,
        },
        {
          id: `${milestoneId}_a4`,
          milestoneId,
          skillId: skill.id,
          title: `${skill.name}: Checkpoint (${assessmentType.replace('_', ' ').toUpperCase()})`,
          type: assessmentType,
          resourceId: null,
          estimatedMinutes: Math.max(20, Math.round(adjustedHours * (preferQuizzes ? 20 : 12))),
          actualMinutes: 0,
          reason: `Verifies demonstrated competence >= ${targetProficiency}% before unlocking downstream skills.`,
          contentAvailability,
          status: baseStatus,
          completedAt: baseCompletedAt,
        },
      ];

      const activities = rawActivities.map(restoreActivity);
      const doneCount = activities.filter((a) => a.status === 'completed').length;
      const milestoneStatus: CompletionStatus =
        doneCount === activities.length
          ? 'completed'
          : doneCount > 0 || activities.some((a) => a.status === 'in_progress')
            ? 'in_progress'
            : 'not_started';

      const prereqs = activePrereqs
        .filter((e) => e.skillId === skill.id)
        .map((e) => e.prerequisiteSkillId);

      const blueprint = registry.getBlueprintForSkill(skill.id);
      const threshold = blueprint?.passingThresholdPercent ?? targetProficiency;

      return {
        id: milestoneId,
        stageId: `${pathId}_st${stageIdx + 1}`,
        title: skill.name,
        description: skill.description,
        skillIds: [skill.id],
        prerequisiteSkillIds: prereqs,
        estimatedHours: adjustedHours,
        readinessState: milestoneStatus === 'completed' ? 'completed' : readinessState,
        reason: milestoneReason,
        completionCriteria: `Achieve >= ${threshold}% on ${skill.name} checkpoint (${assessmentType}) and complete ${practiceType} practice.`,
        assessmentId: `quiz_${skill.id}`,
        projectPrompt: `Create an offline-verifiable study artifact or problem solution demonstrating ${skill.name} (${skill.domain}).`,
        activities,
        status: milestoneStatus,
        orderIndex: mIdx,
      };
    });

    const stageHours = milestones.reduce((acc, m) => acc + m.estimatedHours, 0);
    const stageDone = milestones.every((m) => m.status === 'completed');
    const stageActive = !stageDone && milestones.some((m) => m.status !== 'not_started');

    return {
      id: `${pathId}_st${stageIdx + 1}`,
      pathId,
      title: bucket.title,
      description: bucket.description,
      orderIndex: stageIdx,
      estimatedHours: stageHours,
      milestones,
      status: stageDone ? 'completed' : stageActive ? 'in_progress' : 'not_started',
    };
  });

  const totalEstimatedHours = stages.reduce((acc, st) => acc + st.estimatedHours, 0);
  const safeDailyHours =
    profile && Number.isFinite(profile.availableHoursPerDay)
      ? Math.max(0.25, Math.min(16, profile.availableHoursPerDay))
      : 2;
  const safeDaysPerWeek =
    profile && Number.isFinite(profile.studyDaysPerWeek)
      ? Math.max(1, Math.min(7, Math.round(profile.studyDaysPerWeek)))
      : 5;
  const rawWeeklyBudget = Number((safeDailyHours * safeDaysPerWeek).toFixed(1));
  const weeklyHoursBudget =
    allocatedWeeklyHours !== undefined && Number.isFinite(allocatedWeeklyHours) && allocatedWeeklyHours > 0
      ? Number(allocatedWeeklyHours.toFixed(1))
      : rawWeeklyBudget;

  const remainingHours = stages
    .flatMap((st) => st.milestones)
    .filter((m) => m.status !== 'completed')
    .reduce((acc, m) => acc + m.estimatedHours, 0);
  const estimatedWeeks =
    weeklyHoursBudget > 0 && remainingHours > 0
      ? Math.max(1, Math.ceil(remainingHours / weeklyHoursBudget))
      : 0;

  let deadlineStatus: LearningPath['deadlineStatus'] = { realistic: true, warning: null };
  const targetDeadline = goal.targetCompletionDate ?? profile?.targetCompletionDate ?? null;
  if (targetDeadline) {
    const startMs = Date.parse(`${startDateISO}T00:00:00Z`);
    const endMs = Date.parse(`${targetDeadline}T00:00:00Z`);
    if (Number.isNaN(endMs) || targetDeadline < startDateISO) {
      deadlineStatus = {
        realistic: false,
        warning: `Target date (${targetDeadline}) is invalid or precedes start date (${startDateISO}); estimated ${estimatedWeeks} week(s) at ${weeklyHoursBudget}h/wk.`,
      };
    } else {
      const days = Math.max(1, Math.round((endMs - startMs) / 86_400_000));
      const availableTotalHours = Number(((days / 7) * weeklyHoursBudget).toFixed(1));
      if (remainingHours > availableTotalHours) {
        deadlineStatus = {
          realistic: false,
          warning: `Remaining workload (~${remainingHours}h) exceeds available capacity (~${availableTotalHours}h at ${weeklyHoursBudget}h/wk before ${targetDeadline}).`,
        };
      }
    }
  }

  const now = new Date().toISOString();
  const regenerationSummary = previousPath
    ? `Regenerated cleanly: preserved ${preservedCompletedCount} completed activity item(s); ${blockedSkillIds.length} downstream milestone(s) await prerequisites.`
    : `Generated initial prerequisite-ordered pathway (${weeklyHoursBudget}h/wk, ~${estimatedWeeks}w).`;

  return {
    id: pathId,
    learnerId,
    goalId: goal.id,
    title: `${goal.title} — Personalised Pathway`,
    objective: goal.structuredObjectives.join(' • ') || goal.rawDescription,
    totalEstimatedHours,
    weeklyHoursBudget,
    estimatedWeeks,
    deadlineStatus,
    blockedSkillIds,
    regenerationSummary,
    stages,
    generatedAt: previousPath?.generatedAt ?? now,
    updatedAt: now,
  };
}
