import type {
  CompletionStatus,
  LearnerProfile,
  LearnerSkill,
  LearningGoal,
  LearningMilestone,
  LearningPath,
  LearningResource,
  Skill,
  SkillPrerequisite,
} from '@alc/shared-types';
import { prioritizeAndAllocateGoals } from './goal-management';
import { buildPersonalizedLearningPath } from './index';
import { defaultDomainRegistry, type DomainRegistry } from './universal-catalog';

export interface RoadmapProgressStats {
  totalMilestones: number;
  completedMilestones: number;
  readyMilestones: number;
  blockedMilestones: number;
  totalActivities: number;
  completedActivities: number;
  estimatedMinutes: number;
  actualMinutes: number;
  completionPercent: number;
}

export interface RoadmapRegenerationPreview {
  preservedCompletedActivities: number;
  previousTotalHours: number;
  nextTotalHours: number;
  hoursDelta: number;
  unlockedSkillIds: string[];
  blockedSkillIds: string[];
  deadlineRealistic: boolean;
  deadlineWarning: string | null;
  summary: string;
}

/**
 * Updates a single activity status and optional actual effort minutes while automatically
 * recalculating parent milestone & stage completion statuses.
 */
export function applyActivityStatusUpdate(params: {
  path: LearningPath;
  activityId: string;
  status: CompletionStatus;
  actualMinutes?: number;
  now?: string;
}): LearningPath {
  const { path, activityId, status, actualMinutes, now = new Date().toISOString() } = params;

  const nextStages = path.stages.map((stage) => {
    const nextMilestones: LearningMilestone[] = stage.milestones.map((m) => {
      if (!m.activities.some((a) => a.id === activityId)) return m;
      const nextActivities = m.activities.map((a) => {
        if (a.id !== activityId) return a;
        return {
          ...a,
          status,
          completedAt: status === 'completed' ? a.completedAt ?? now : null,
          actualMinutes:
            actualMinutes !== undefined && Number.isFinite(actualMinutes) && actualMinutes >= 0
              ? Math.round(actualMinutes)
              : a.actualMinutes ?? (status === 'completed' ? a.estimatedMinutes : 0),
        };
      });
      const allDone = nextActivities.every((a) => a.status === 'completed');
      const anyProgress = !allDone && nextActivities.some((a) => a.status !== 'not_started');
      const mStatus: CompletionStatus = allDone
        ? 'completed'
        : anyProgress
          ? 'in_progress'
          : 'not_started';
      return {
        ...m,
        activities: nextActivities,
        status: mStatus,
        readinessState: mStatus === 'completed' ? ('completed' as const) : m.readinessState,
      };
    });

    const stageDone = nextMilestones.every((m) => m.status === 'completed');
    const stageActive = !stageDone && nextMilestones.some((m) => m.status !== 'not_started');
    return {
      ...stage,
      milestones: nextMilestones,
      status: (stageDone ? 'completed' : stageActive ? 'in_progress' : 'not_started') as CompletionStatus,
    };
  });

  return {
    ...path,
    stages: nextStages,
    updatedAt: now,
  };
}

/**
 * Computes real estimated vs actual effort and milestone completion statistics directly from a LearningPath.
 */
export function computeRoadmapProgressStats(path: LearningPath): RoadmapProgressStats {
  let totalMilestones = 0;
  let completedMilestones = 0;
  let readyMilestones = 0;
  let blockedMilestones = 0;
  let totalActivities = 0;
  let completedActivities = 0;
  let estimatedMinutes = 0;
  let actualMinutes = 0;

  for (const st of path.stages) {
    for (const m of st.milestones) {
      totalMilestones += 1;
      if (m.status === 'completed') completedMilestones += 1;
      else if (m.readinessState === 'blocked') blockedMilestones += 1;
      else readyMilestones += 1;

      for (const a of m.activities) {
        totalActivities += 1;
        estimatedMinutes += a.estimatedMinutes;
        actualMinutes += a.actualMinutes ?? 0;
        if (a.status === 'completed') completedActivities += 1;
      }
    }
  }

  return {
    totalMilestones,
    completedMilestones,
    readyMilestones,
    blockedMilestones,
    totalActivities,
    completedActivities,
    estimatedMinutes,
    actualMinutes,
    completionPercent:
      totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0,
  };
}

/**
 * Non-destructive preview explaining exactly what changes when regenerating a roadmap.
 */
export function previewRoadmapRegeneration(params: {
  currentPath: LearningPath;
  goal: LearningGoal;
  profile: LearnerProfile | null;
  learnerSkills: LearnerSkill[];
  resources: LearningResource[];
  skills?: Skill[];
  prerequisites?: SkillPrerequisite[];
  registry?: DomainRegistry;
  allocatedWeeklyHours?: number;
  startDateISO?: string;
}): RoadmapRegenerationPreview {
  const { currentPath } = params;
  const candidate = buildPersonalizedLearningPath({
    pathId: currentPath.id,
    learnerId: currentPath.learnerId,
    goal: params.goal,
    profile: params.profile,
    learnerSkills: params.learnerSkills,
    resources: params.resources,
    skills: params.skills,
    prerequisites: params.prerequisites,
    registry: params.registry,
    previousPath: currentPath,
    allocatedWeeklyHours: params.allocatedWeeklyHours,
    startDateISO: params.startDateISO,
  });

  const prevBlocked = new Set(currentPath.blockedSkillIds ?? []);
  const nextBlocked = candidate.blockedSkillIds ?? [];
  const nextBlockedSet = new Set(nextBlocked);

  const unlockedSkillIds = Array.from(prevBlocked).filter((id) => !nextBlockedSet.has(id));
  const preservedCompletedActivities = candidate.stages
    .flatMap((st) => st.milestones.flatMap((m) => m.activities))
    .filter((a) => a.status === 'completed').length;

  const hoursDelta = candidate.totalEstimatedHours - currentPath.totalEstimatedHours;

  return {
    preservedCompletedActivities,
    previousTotalHours: currentPath.totalEstimatedHours,
    nextTotalHours: candidate.totalEstimatedHours,
    hoursDelta,
    unlockedSkillIds,
    blockedSkillIds: nextBlocked,
    deadlineRealistic: candidate.deadlineStatus?.realistic ?? true,
    deadlineWarning: candidate.deadlineStatus?.warning ?? null,
    summary:
      candidate.regenerationSummary ??
      `Preserves ${preservedCompletedActivities} completed activities; effort delta ${hoursDelta >= 0 ? `+${hoursDelta}h` : `${hoursDelta}h`}.`,
  };
}

/**
 * Coordinates roadmap generation across multiple concurrent active goals without exceeding
 * the learner's real weekly available study capacity.
 */
export function generateMultiGoalRoadmapBundle(params: {
  learnerId: string;
  goals: LearningGoal[];
  profile: LearnerProfile | null;
  learnerSkills: LearnerSkill[];
  resources: LearningResource[];
  existingPaths?: LearningPath[];
  registry?: DomainRegistry;
  startDateISO?: string;
}): {
  weeklyCapacityHours: number;
  totalAllocatedWeeklyHours: number;
  overloadWarning: string | null;
  paths: LearningPath[];
} {
  const {
    learnerId,
    goals,
    profile,
    learnerSkills,
    resources,
    existingPaths = [],
    registry = defaultDomainRegistry,
    startDateISO = new Date().toISOString().slice(0, 10),
  } = params;

  const activeGoals = goals.filter((g) => (g.status ? g.status === 'active' : g.isActive));
  const prioritization = prioritizeAndAllocateGoals({
    goals: activeGoals,
    profile,
    learnerSkills,
    registry,
    todayISO: startDateISO,
  });

  const paths = activeGoals.map((goal) => {
    const alloc = prioritization.allocations.find((a) => a.goalId === goal.id);
    const prev = existingPaths.find((p) => p.goalId === goal.id) ?? null;
    return buildPersonalizedLearningPath({
      pathId: prev?.id ?? `path_${goal.id}`,
      learnerId,
      goal,
      profile,
      learnerSkills,
      resources,
      registry,
      previousPath: prev,
      allocatedWeeklyHours: alloc?.allocatedWeeklyHours,
      startDateISO,
    });
  });

  return {
    weeklyCapacityHours: prioritization.weeklyCapacityHours,
    totalAllocatedWeeklyHours: prioritization.totalAllocatedWeeklyHours,
    overloadWarning: prioritization.overloadWarning,
    paths,
  };
}
