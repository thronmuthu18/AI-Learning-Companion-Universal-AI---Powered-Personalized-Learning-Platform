import type {
  AssessmentAttempt,
  DomainDefinition,
  DomainProgressBreakdown,
  DomainProgressConfig,
  GoalProgressBreakdown,
  LearnerSkill,
  LearningGoal,
  LearningPath,
  ProgressHistorySnapshot,
  ProgressRecord,
  QuizAttempt,
  RetentionEstimate,
  Skill,
  SkillProgressBreakdown,
  StudySession,
  TopicProgressBreakdown,
} from '@alc/shared-types';

export interface WeeklyRollupPoint {
  dateISO: string;
  minutesStudied: number;
  sessionsCompleted: number;
}

export interface ProgressDashboardMetrics {
  completedTopicsCount: number;
  pendingTopicsCount: number;
  inProgressActivitiesCount: number;
  skippedActivitiesCount: number;
  completedMilestonesCount: number;
  totalMilestonesCount: number;
  roadmapCompletionPercent: number;
  totalStudyHours: number;
  plannedMinutesTotal: number;
  actualMinutesTotal: number;
  studyTimeAccuracyPercent: number | null;
  consistencyScorePercent: number;
  activeStudyDaysLast14: number;
  averageQuizScorePercent: number | null;
  averageAssessmentScorePercent: number | null;
  overallDemonstratedMasteryPercent: number | null;
  averageSelfReportedConfidencePercent: number | null;
  evidenceStatus: 'insufficient' | 'partial' | 'sufficient';
  assessmentTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  currentStreakDays: number;
  longestStreakDays: number;
  strongSkillsCount: number;
  weakSkillsCount: number;
  missingSkillsCount: number;
  unassessedSkillsCount: number;
  weakAreas: Array<{ skillId: string; demonstratedCompetence: number }>;
  weeklyActivity: WeeklyRollupPoint[];
  skillProgress: SkillProgressBreakdown[];
  topicProgress: TopicProgressBreakdown[];
  domainProgress: DomainProgressBreakdown[];
  goalProgress: GoalProgressBreakdown[];
  retentionIndicators: RetentionEstimate[];
  historyTimeline: ProgressHistorySnapshot[];
  recentEventsCount: number;
}

export const DEFAULT_DOMAIN_PROGRESS_CONFIG: Required<DomainProgressConfig> = {
  masteryThresholdPercent: 75,
  weakThresholdPercent: 45,
  retentionWindowDays: 14,
  minAssessmentsForEvidence: 1,
};

function prevDayISO(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  if (!y || !m || !d) return dateISO;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  if (!y || !m || !d) return dateISO;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function diffDaysISO(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = toISO.slice(0, 10).split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return 0;
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function safeNonNeg(n: number | undefined | null): number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
}

export function computeStreaksFromDates(
  activeDatesISO: string[],
  todayISO: string,
): {
  currentStreakDays: number;
  longestStreakDays: number;
} {
  const unique = Array.from(new Set(activeDatesISO.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))).sort();
  if (unique.length === 0) return { currentStreakDays: 0, longestStreakDays: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    const expectedPrev = prevDayISO(unique[i]!);
    if (unique[i - 1] === expectedPrev) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  const dateSet = new Set(unique);
  let current = 0;
  let cursor = dateSet.has(todayISO) ? todayISO : prevDayISO(todayISO);
  while (dateSet.has(cursor)) {
    current += 1;
    cursor = prevDayISO(cursor);
  }

  return { currentStreakDays: current, longestStreakDays: longest };
}

/**
 * Estimates retention risk strictly from recorded review/assessment timestamps and historical error rates.
 * Explicitly framed as an evidence-based estimate (does not claim biological memory measurement).
 */
export function computeSkillRetentionEstimate(params: {
  skillId: string;
  skillName: string;
  domainId: string;
  learnerSkill: LearnerSkill | undefined;
  skillScores: number[];
  lastRevisionDateISO: string | null;
  todayISO: string;
  config?: DomainProgressConfig;
}): RetentionEstimate {
  const {
    skillId,
    skillName,
    domainId,
    learnerSkill,
    skillScores,
    lastRevisionDateISO,
    todayISO,
    config,
  } = params;
  const cfg = { ...DEFAULT_DOMAIN_PROGRESS_CONFIG, ...config };
  const assessmentCount = learnerSkill?.assessmentCount ?? 0;

  if (!learnerSkill || assessmentCount === 0) {
    return {
      skillId,
      skillName,
      domainId,
      lastVerifiedAt: null,
      daysSinceLastReview: null,
      lastAssessmentScorePercent: null,
      repeatedLowScoreCount: 0,
      confidenceVsCompetenceGap: null,
      suggestedRevisionIntervalDays: cfg.retentionWindowDays,
      nextRecommendedReviewDateISO: null,
      retentionRisk: 'insufficient_data',
      needsReassessment: true,
      explanation:
        'Insufficient assessment evidence to estimate retention; baseline verification assessment needed.',
    };
  }

  const verifiedDateISO = learnerSkill.lastAssessedAt ? learnerSkill.lastAssessedAt.slice(0, 10) : null;
  const effectiveReviewISO =
    lastRevisionDateISO && (!verifiedDateISO || lastRevisionDateISO > verifiedDateISO)
      ? lastRevisionDateISO
      : verifiedDateISO;

  const daysSince = effectiveReviewISO ? diffDaysISO(effectiveReviewISO, todayISO) : null;
  const lastScore =
    skillScores.length > 0 ? skillScores[skillScores.length - 1]! : learnerSkill.demonstratedCompetence;
  const lowCount = skillScores.filter((s) => s < 65).length;
  const gap = Math.round(learnerSkill.selfReportedConfidence - learnerSkill.demonstratedCompetence);

  // Shorter suggested review intervals when competence is low or repeated errors occurred
  let suggestedInterval = cfg.retentionWindowDays;
  if (learnerSkill.demonstratedCompetence < 60 || lowCount >= 2) {
    suggestedInterval = Math.max(3, Math.floor(cfg.retentionWindowDays * 0.35));
  } else if (learnerSkill.demonstratedCompetence < cfg.masteryThresholdPercent || gap >= 20) {
    suggestedInterval = Math.max(5, Math.floor(cfg.retentionWindowDays * 0.6));
  }

  const nextReviewDateISO = effectiveReviewISO ? addDaysISO(effectiveReviewISO, suggestedInterval) : todayISO;
  let retentionRisk: RetentionEstimate['retentionRisk'] = 'low';
  if (lowCount >= 2 || (daysSince !== null && daysSince > suggestedInterval * 1.5) || learnerSkill.demonstratedCompetence < 55) {
    retentionRisk = 'high';
  } else if (
    (daysSince !== null && daysSince >= suggestedInterval) ||
    gap >= 20 ||
    learnerSkill.demonstratedCompetence < cfg.masteryThresholdPercent
  ) {
    retentionRisk = 'moderate';
  }

  return {
    skillId,
    skillName,
    domainId,
    lastVerifiedAt: learnerSkill.lastAssessedAt,
    daysSinceLastReview: daysSince,
    lastAssessmentScorePercent: lastScore,
    repeatedLowScoreCount: lowCount,
    confidenceVsCompetenceGap: gap,
    suggestedRevisionIntervalDays: suggestedInterval,
    nextRecommendedReviewDateISO: nextReviewDateISO,
    retentionRisk,
    needsReassessment: retentionRisk === 'high' || (daysSince !== null && daysSince >= suggestedInterval),
    explanation: `Estimate derived from recorded activity/assessments (competence ${learnerSkill.demonstratedCompetence}%, confidence gap ${gap >= 0 ? '+' : ''}${gap}%, ${daysSince ?? 0}d since review, interval ${suggestedInterval}d).`,
  };
}

/**
 * Computes comprehensive universal progress dashboard metrics strictly from persisted database records.
 * Never fabricates mastery from study duration alone and separates confidence from demonstrated competence.
 */
export function computeProgressMetrics(params: {
  paths: LearningPath[];
  sessions: StudySession[];
  assessmentAttempts: AssessmentAttempt[];
  quizAttempts: QuizAttempt[];
  learnerSkills: LearnerSkill[];
  progressRecords: ProgressRecord[];
  todayISO: string;
  goals?: LearningGoal[];
  skills?: Skill[];
  domains?: DomainDefinition[];
  domainConfigs?: Record<string, DomainProgressConfig>;
}): ProgressDashboardMetrics {
  const {
    paths,
    sessions,
    assessmentAttempts,
    quizAttempts,
    learnerSkills,
    progressRecords,
    todayISO,
    goals = [],
    skills = [],
    domains = [],
    domainConfigs = {},
  } = params;

  const skillMetaMap = new Map(skills.map((s) => [s.id, s]));
  const domainNameMap = new Map(domains.map((d) => [d.id, d.name]));
  const learnerSkillMap = new Map(learnerSkills.map((ls) => [ls.skillId, ls]));

  let completedTopicsCount = 0;
  let pendingTopicsCount = 0;
  let inProgressActivitiesCount = 0;
  let skippedActivitiesCount = 0;
  let completedMilestonesCount = 0;
  let totalMilestonesCount = 0;

  const activitiesBySkill = new Map<string, { completed: number; total: number }>();
  const activitiesByTopic = new Map<
    string,
    {
      topicName: string;
      domainId: string;
      completed: number;
      total: number;
      skillIds: Set<string>;
    }
  >();

  for (const p of paths) {
    for (const stage of p.stages) {
      for (const m of stage.milestones) {
        totalMilestonesCount += 1;
        if (m.status === 'completed') completedMilestonesCount += 1;
        for (const a of m.activities) {
          if (a.status === 'completed') completedTopicsCount += 1;
          else {
            pendingTopicsCount += 1;
            if (a.status === 'in_progress' || a.status === 'partially_completed') {
              inProgressActivitiesCount += 1;
            }
            if (a.status === 'skipped') skippedActivitiesCount += 1;
          }

          const skCount = activitiesBySkill.get(a.skillId) ?? { completed: 0, total: 0 };
          skCount.total += 1;
          if (a.status === 'completed') skCount.completed += 1;
          activitiesBySkill.set(a.skillId, skCount);

          const skMeta = skillMetaMap.get(a.skillId);
          const topicKey = skMeta?.topicId ?? skMeta?.subjectId ?? skMeta?.domainId ?? a.skillId;
          const tEntry = activitiesByTopic.get(topicKey) ?? {
            topicName: skMeta?.name ?? topicKey,
            domainId: skMeta?.domainId ?? 'general',
            completed: 0,
            total: 0,
            skillIds: new Set<string>(),
          };
          tEntry.total += 1;
          if (a.status === 'completed') tEntry.completed += 1;
          tEntry.skillIds.add(a.skillId);
          activitiesByTopic.set(topicKey, tEntry);
        }
      }
    }
  }

  const totalActivities = completedTopicsCount + pendingTopicsCount;
  const roadmapCompletionPercent =
    totalActivities > 0
      ? Math.round((completedTopicsCount / totalActivities) * 100)
      : totalMilestonesCount > 0
        ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100)
        : 0;

  const nonBreakSessions = sessions.filter((s) => s.sessionType !== 'break');
  const loggedSessions = nonBreakSessions.filter(
    (s) => s.status === 'completed' || s.status === 'partially_completed',
  );
  const plannedMinutesTotal = loggedSessions.reduce((acc, s) => acc + safeNonNeg(s.plannedMinutes), 0);
  const actualMinutesTotal = loggedSessions.reduce(
    (acc, s) => acc + (safeNonNeg(s.actualMinutes) > 0 ? safeNonNeg(s.actualMinutes) : safeNonNeg(s.plannedMinutes)),
    0,
  );
  const studyTimeAccuracyPercent =
    plannedMinutesTotal > 0 ? Math.round((actualMinutesTotal / plannedMinutesTotal) * 100) : null;

  const recordMinutes = progressRecords.reduce((acc, r) => acc + safeNonNeg(r.minutesStudied), 0);
  const totalMinutes = Math.max(actualMinutesTotal, recordMinutes);
  const totalStudyHours = Number((totalMinutes / 60).toFixed(1));

  const averageQuizScorePercent =
    quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((acc, q) => acc + safeNonNeg(q.scorePercent), 0) / quizAttempts.length)
      : null;

  const averageAssessmentScorePercent =
    assessmentAttempts.length > 0
      ? Math.round(
          assessmentAttempts.reduce((acc, a) => acc + safeNonNeg(a.scorePercent), 0) /
            assessmentAttempts.length,
        )
      : null;

  const activeDates = [
    ...loggedSessions.map((s) => s.dateISO),
    ...progressRecords.filter((r) => safeNonNeg(r.minutesStudied) > 0).map((r) => r.dateISO),
    ...quizAttempts.map((q) => q.completedAt.slice(0, 10)),
    ...assessmentAttempts.map((a) => a.completedAt.slice(0, 10)),
  ].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const { currentStreakDays, longestStreakDays } = computeStreaksFromDates(activeDates, todayISO);

  const window14Start = addDaysISO(todayISO, -13);
  const activeLast14Set = new Set(activeDates.filter((d) => d >= window14Start && d <= todayISO));
  const activeStudyDaysLast14 = activeLast14Set.size;
  const consistencyScorePercent = Math.min(100, Math.round((activeStudyDaysLast14 / 10) * 100));

  // Build 7-day rolling window ending on todayISO
  const weeklyActivity: WeeklyRollupPoint[] = [];
  let cursor = todayISO;
  for (let i = 0; i < 7; i += 1) {
    const daySessions = loggedSessions.filter((s) => s.dateISO === cursor);
    const daySessMinutes = daySessions.reduce(
      (acc, s) => acc + (safeNonNeg(s.actualMinutes) > 0 ? safeNonNeg(s.actualMinutes) : safeNonNeg(s.plannedMinutes)),
      0,
    );
    const dayRecMinutes = progressRecords
      .filter((r) => r.dateISO === cursor)
      .reduce((acc, r) => acc + safeNonNeg(r.minutesStudied), 0);
    weeklyActivity.unshift({
      dateISO: cursor,
      minutesStudied: Math.max(daySessMinutes, dayRecMinutes),
      sessionsCompleted: daySessions.length,
    });
    cursor = prevDayISO(cursor);
  }

  // Score history & study minutes per skill
  const scoresBySkill = new Map<string, number[]>();
  const sortedAssessments = [...assessmentAttempts].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  );
  for (const att of sortedAssessments) {
    for (const [skillId, breakdown] of Object.entries(att.skillBreakdown)) {
      const arr = scoresBySkill.get(skillId) ?? [];
      arr.push(breakdown.scorePercent);
      scoresBySkill.set(skillId, arr);
    }
  }
  const sortedQuizzes = [...quizAttempts].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  for (const qa of sortedQuizzes) {
    const arr = scoresBySkill.get(qa.skillId) ?? [];
    arr.push(qa.scorePercent);
    scoresBySkill.set(qa.skillId, arr);
  }

  const minutesBySkill = new Map<string, number>();
  const lastRevisionBySkill = new Map<string, string>();
  for (const s of loggedSessions) {
    const mins = safeNonNeg(s.actualMinutes) > 0 ? safeNonNeg(s.actualMinutes) : safeNonNeg(s.plannedMinutes);
    minutesBySkill.set(s.skillId, (minutesBySkill.get(s.skillId) ?? 0) + mins);
    if (s.sessionType === 'revision') {
      const prev = lastRevisionBySkill.get(s.skillId);
      if (!prev || s.dateISO > prev) lastRevisionBySkill.set(s.skillId, s.dateISO);
    }
  }

  // Strictly only verified assessments determine mastery & trend
  const assessedSkills = learnerSkills.filter((ls) => ls.assessmentCount > 0);
  const overallDemonstratedMasteryPercent =
    assessedSkills.length > 0
      ? Math.round(
          assessedSkills.reduce((acc, ls) => acc + ls.demonstratedCompetence, 0) / assessedSkills.length,
        )
      : null;
  const averageSelfReportedConfidencePercent =
    learnerSkills.length > 0
      ? Math.round(
          learnerSkills.reduce((acc, ls) => acc + ls.selfReportedConfidence, 0) / learnerSkills.length,
        )
      : null;

  const evidenceStatus: ProgressDashboardMetrics['evidenceStatus'] =
    assessedSkills.length === 0
      ? 'insufficient'
      : learnerSkills.length > 0 && assessedSkills.length >= learnerSkills.length
        ? 'sufficient'
        : 'partial';

  let assessmentTrend: ProgressDashboardMetrics['assessmentTrend'] = 'insufficient_data';
  const combinedScores = [
    ...sortedAssessments.map((a) => ({ date: a.completedAt, score: a.scorePercent })),
    ...sortedQuizzes.map((q) => ({ date: q.completedAt, score: q.scorePercent })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  if (combinedScores.length >= 2) {
    const firstHalfAvg =
      combinedScores.slice(0, Math.floor(combinedScores.length / 2)).reduce((acc, x) => acc + x.score, 0) /
      Math.max(1, Math.floor(combinedScores.length / 2));
    const secondHalfAvg =
      combinedScores.slice(Math.floor(combinedScores.length / 2)).reduce((acc, x) => acc + x.score, 0) /
      Math.max(1, combinedScores.length - Math.floor(combinedScores.length / 2));
    const delta = secondHalfAvg - firstHalfAvg;
    assessmentTrend = delta >= 5 ? 'improving' : delta <= -5 ? 'declining' : 'stable';
  }

  // Per-skill & retention breakdowns across all known skills
  const allSkillIds = Array.from(
    new Set([
      ...learnerSkills.map((ls) => ls.skillId),
      ...activitiesBySkill.keys(),
      ...minutesBySkill.keys(),
      ...goals.flatMap((g) => g.targetSkillIds),
    ]),
  );

  const skillProgress: SkillProgressBreakdown[] = [];
  const retentionIndicators: RetentionEstimate[] = [];
  for (const skillId of allSkillIds) {
    const ls = learnerSkillMap.get(skillId);
    const meta = skillMetaMap.get(skillId);
    const domainId = meta?.domainId ?? 'general';
    const cfg = { ...DEFAULT_DOMAIN_PROGRESS_CONFIG, ...domainConfigs[domainId] };
    const retention = computeSkillRetentionEstimate({
      skillId,
      skillName: meta?.name ?? skillId,
      domainId,
      learnerSkill: ls,
      skillScores: scoresBySkill.get(skillId) ?? [],
      lastRevisionDateISO: lastRevisionBySkill.get(skillId) ?? null,
      todayISO,
      config: cfg,
    });
    retentionIndicators.push(retention);

    const acts = activitiesBySkill.get(skillId) ?? { completed: 0, total: 0 };
    const selfConf = ls?.selfReportedConfidence ?? 0;
    const demComp = ls && ls.assessmentCount > 0 ? ls.demonstratedCompetence : 0;
    const gap = ls && ls.assessmentCount > 0 ? Math.round(selfConf - demComp) : 0;

    skillProgress.push({
      skillId,
      skillName: meta?.name ?? skillId,
      domainId,
      subjectId: meta?.subjectId ?? domainId,
      topicId: meta?.topicId ?? meta?.subjectId ?? skillId,
      status: ls?.status ?? 'unassessed',
      selfReportedConfidence: selfConf,
      demonstratedCompetence: demComp,
      assessmentCount: ls?.assessmentCount ?? 0,
      hasSufficientEvidence: (ls?.assessmentCount ?? 0) >= cfg.minAssessmentsForEvidence,
      confidenceGap: gap,
      isOverconfident: (ls?.assessmentCount ?? 0) > 0 && gap >= 20,
      activitiesCompleted: acts.completed,
      activitiesTotal: acts.total,
      studyMinutesLogged: minutesBySkill.get(skillId) ?? 0,
      retentionRisk: retention.retentionRisk,
    });
  }

  // Topic-level aggregation
  const topicProgress: TopicProgressBreakdown[] = Array.from(activitiesByTopic.entries()).map(
    ([topicKey, entry]) => {
      const relevant = Array.from(entry.skillIds)
        .map((sid) => learnerSkillMap.get(sid))
        .filter((x): x is LearnerSkill => Boolean(x && x.assessmentCount > 0));
      const totalSkillCount = entry.skillIds.size;
      const mins = Array.from(entry.skillIds).reduce(
        (acc, sid) => acc + (minutesBySkill.get(sid) ?? 0),
        0,
      );
      return {
        topicKey,
        topicName: entry.topicName,
        domainId: entry.domainId,
        completedActivities: entry.completed,
        totalActivities: entry.total,
        completionPercent: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
        studyMinutesLogged: mins,
        assessedSkillCount: relevant.length,
        totalSkillCount,
        demonstratedMasteryPercent:
          relevant.length > 0
            ? Math.round(relevant.reduce((acc, x) => acc + x.demonstratedCompetence, 0) / relevant.length)
            : null,
        evidenceStatus:
          relevant.length === 0
            ? 'insufficient'
            : relevant.length >= totalSkillCount
              ? 'sufficient'
              : 'partial',
      };
    },
  );

  // Domain-wise aggregation
  const domainIds = new Set<string>();
  for (const g of goals) if (g.domainId) domainIds.add(g.domainId);
  for (const sp of skillProgress) if (sp.domainId) domainIds.add(sp.domainId);
  const pathByGoalId = new Map(paths.map((p) => [p.goalId, p]));

  const domainProgress: DomainProgressBreakdown[] = Array.from(domainIds).map((domainId) => {
    const domainGoals = goals.filter((g) => (g.domainId ?? 'general') === domainId);
    const domainSkills = skillProgress.filter((s) => s.domainId === domainId);
    let dCompleted = 0;
    let dPending = 0;
    let dSkipped = 0;
    for (const g of domainGoals) {
      const p = pathByGoalId.get(g.id);
      if (!p) continue;
      for (const st of p.stages) {
        for (const m of st.milestones) {
          for (const a of m.activities) {
            if (a.status === 'completed') dCompleted += 1;
            else {
              dPending += 1;
              if (a.status === 'skipped') dSkipped += 1;
            }
          }
        }
      }
    }
    if (domainGoals.length === 0) {
      dCompleted = domainSkills.reduce((acc, s) => acc + s.activitiesCompleted, 0);
      dPending = domainSkills.reduce((acc, s) => acc + Math.max(0, s.activitiesTotal - s.activitiesCompleted), 0);
    }
    const dTotal = dCompleted + dPending;
    const assessed = domainSkills.filter((s) => s.assessmentCount > 0);
    const mins = domainSkills.reduce((acc, s) => acc + s.studyMinutesLogged, 0);

    return {
      domainId,
      domainName: domainNameMap.get(domainId) ?? domainId,
      goalCount: domainGoals.length,
      completedActivities: dCompleted,
      pendingActivities: dPending,
      skippedActivities: dSkipped,
      completionPercent: dTotal > 0 ? Math.round((dCompleted / dTotal) * 100) : 0,
      studyHoursLogged: Number((mins / 60).toFixed(1)),
      strongSkillsCount: domainSkills.filter((s) => s.status === 'strong').length,
      weakSkillsCount: domainSkills.filter((s) => s.status === 'weak').length,
      missingSkillsCount: domainSkills.filter((s) => s.status === 'missing').length,
      unassessedSkillsCount: domainSkills.filter((s) => s.status === 'unassessed').length,
      demonstratedMasteryPercent:
        assessed.length > 0
          ? Math.round(assessed.reduce((acc, s) => acc + s.demonstratedCompetence, 0) / assessed.length)
          : null,
      averageConfidencePercent:
        domainSkills.length > 0
          ? Math.round(domainSkills.reduce((acc, s) => acc + s.selfReportedConfidence, 0) / domainSkills.length)
          : null,
      evidenceStatus:
        assessed.length === 0
          ? 'insufficient'
          : assessed.length >= domainSkills.length
            ? 'sufficient'
            : 'partial',
    };
  });

  // Goal-wise progress aggregation
  const goalProgress: GoalProgressBreakdown[] = goals.map((g) => {
    const p = pathByGoalId.get(g.id);
    let completedActs = 0;
    let totalActs = 0;
    let compMilestones = 0;
    let totMilestones = 0;
    const skillIdsInGoal = new Set<string>(g.targetSkillIds);

    if (p) {
      for (const st of p.stages) {
        for (const m of st.milestones) {
          totMilestones += 1;
          if (m.status === 'completed') compMilestones += 1;
          for (const a of m.activities) {
            totalActs += 1;
            skillIdsInGoal.add(a.skillId);
            if (a.status === 'completed') completedActs += 1;
          }
        }
      }
    }

    const goalTargetSkills = Array.from(skillIdsInGoal)
      .map((sid) => learnerSkillMap.get(sid))
      .filter((x): x is LearnerSkill => Boolean(x));
    const assessedGoalSkills = goalTargetSkills.filter((x) => x.assessmentCount > 0);
    const goalMins = loggedSessions
      .filter((s) => (s.goalId ? s.goalId === g.id : skillIdsInGoal.has(s.skillId)))
      .reduce((acc, s) => acc + (safeNonNeg(s.actualMinutes) > 0 ? safeNonNeg(s.actualMinutes) : safeNonNeg(s.plannedMinutes)), 0);

    return {
      goalId: g.id,
      title: g.title,
      domainId: g.domainId ?? 'general',
      priority: g.priority ?? 'medium',
      status: g.status ?? (g.isActive ? 'active' : 'paused'),
      completedActivities: completedActs,
      totalActivities: totalActs,
      roadmapCompletionPercent:
        totalActs > 0
          ? Math.round((completedActs / totalActs) * 100)
          : totMilestones > 0
            ? Math.round((compMilestones / totMilestones) * 100)
            : 0,
      completedMilestones: compMilestones,
      totalMilestones: totMilestones,
      loggedStudyHours: Number((goalMins / 60).toFixed(1)),
      plannedStudyHours: p?.totalEstimatedHours ?? g.estimatedScopeHours ?? 0,
      assessedTargetSkills: assessedGoalSkills.length,
      totalTargetSkills: skillIdsInGoal.size,
      demonstratedMasteryPercent:
        assessedGoalSkills.length > 0
          ? Math.round(
              assessedGoalSkills.reduce((acc, x) => acc + x.demonstratedCompetence, 0) /
                assessedGoalSkills.length,
            )
          : null,
      hasSufficientEvidence:
        skillIdsInGoal.size > 0 && assessedGoalSkills.length >= Math.min(skillIdsInGoal.size, 1),
      deadlineRealistic: p?.deadlineStatus?.realistic ?? true,
    };
  });

  // Historical chronological timeline strictly from persisted logs & attempts
  const timelineMap = new Map<
    string,
    { minutes: number; topics: number; assessments: number; scores: number[] }
  >();
  for (const r of progressRecords) {
    const key = r.dateISO.slice(0, 10);
    const cur = timelineMap.get(key) ?? { minutes: 0, topics: 0, assessments: 0, scores: [] };
    cur.minutes += safeNonNeg(r.minutesStudied);
    cur.topics += safeNonNeg(r.topicsCompleted);
    cur.assessments += safeNonNeg(r.quizzesCompleted);
    if (typeof r.averageQuizScore === 'number') cur.scores.push(r.averageQuizScore);
    timelineMap.set(key, cur);
  }
  for (const a of sortedAssessments) {
    const key = a.completedAt.slice(0, 10);
    const cur = timelineMap.get(key) ?? { minutes: 0, topics: 0, assessments: 0, scores: [] };
    cur.assessments += 1;
    cur.scores.push(a.scorePercent);
    timelineMap.set(key, cur);
  }
  for (const q of sortedQuizzes) {
    const key = q.completedAt.slice(0, 10);
    const cur = timelineMap.get(key) ?? { minutes: 0, topics: 0, assessments: 0, scores: [] };
    cur.assessments += 1;
    cur.scores.push(q.scorePercent);
    timelineMap.set(key, cur);
  }

  let runningMinutes = 0;
  const historyTimeline: ProgressHistorySnapshot[] = Array.from(timelineMap.keys())
    .sort()
    .map((dateISO) => {
      const entry = timelineMap.get(dateISO)!;
      runningMinutes += entry.minutes;
      return {
        dateISO,
        cumulativeMinutesStudied: runningMinutes,
        topicsCompleted: entry.topics,
        assessmentsCompleted: entry.assessments,
        averageScorePercent:
          entry.scores.length > 0
            ? Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length)
            : null,
      };
    });

  return {
    completedTopicsCount,
    pendingTopicsCount,
    inProgressActivitiesCount,
    skippedActivitiesCount,
    completedMilestonesCount,
    totalMilestonesCount,
    roadmapCompletionPercent,
    totalStudyHours,
    plannedMinutesTotal,
    actualMinutesTotal,
    studyTimeAccuracyPercent,
    consistencyScorePercent,
    activeStudyDaysLast14,
    averageQuizScorePercent,
    averageAssessmentScorePercent,
    overallDemonstratedMasteryPercent,
    averageSelfReportedConfidencePercent,
    evidenceStatus,
    assessmentTrend,
    currentStreakDays,
    longestStreakDays,
    strongSkillsCount: learnerSkills.filter((s) => s.status === 'strong').length,
    weakSkillsCount: learnerSkills.filter((s) => s.status === 'weak').length,
    missingSkillsCount: learnerSkills.filter((s) => s.status === 'missing').length,
    unassessedSkillsCount: learnerSkills.filter((s) => s.status === 'unassessed').length,
    weakAreas: learnerSkills
      .filter((s) => s.assessmentCount > 0 && s.demonstratedCompetence < 75)
      .sort((a, b) => a.demonstratedCompetence - b.demonstratedCompetence)
      .map((s) => ({ skillId: s.skillId, demonstratedCompetence: s.demonstratedCompetence })),
    weeklyActivity,
    skillProgress,
    topicProgress,
    domainProgress,
    goalProgress,
    retentionIndicators,
    historyTimeline,
    recentEventsCount:
      assessmentAttempts.length + quizAttempts.length + loggedSessions.length,
  };
}
