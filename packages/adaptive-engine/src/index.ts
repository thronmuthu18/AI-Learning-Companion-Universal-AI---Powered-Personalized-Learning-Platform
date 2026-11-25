import type {
  AssessmentAttempt,
  DomainProgressConfig,
  LearnerSkill,
  LearningFormat,
  LearningGoal,
  LearningPath,
  QuizAttempt,
  Recommendation,
  Skill,
  SkillPrerequisite,
  StudySchedule,
  StudySession,
} from '@alc/shared-types';

export interface AdaptiveEvaluationInput {
  learnerId: string;
  todayISO: string;
  learnerSkills: LearnerSkill[];
  assessmentAttempts: AssessmentAttempt[];
  quizAttempts: QuizAttempt[];
  studySessions: StudySession[];
  learningPaths: LearningPath[];
  goals?: LearningGoal[];
  schedules?: StudySchedule[];
  prerequisites?: SkillPrerequisite[];
  skills?: Skill[];
  preferredFormat?: LearningFormat;
  domainConfigs?: Record<string, DomainProgressConfig>;
}

export interface AdaptiveEvaluationOutput {
  recommendations: Recommendation[];
  shouldRecalculateSchedule: boolean;
  recommendedDifficultyShift: 'easier' | 'maintain' | 'harder';
  delayedAdvancedSkills: string[];
  nextEligibleSkills: string[];
  retentionDueSkills: string[];
}

export interface AdaptiveAdjustmentProposalItem {
  id: string;
  kind:
    | 'insert_revision_session'
    | 'reprioritize_milestone'
    | 'unlock_next_skill'
    | 'reschedule_missed_sessions';
  targetSkillId: string | null;
  targetDomainId: string | null;
  description: string;
  rationale: string;
}

export interface AdaptivePlanAdjustmentPreview {
  suggestedDifficultyShift: 'easier' | 'maintain' | 'harder';
  newlyMasteredSkillIds: string[];
  persistentWeakSkillIds: string[];
  delayedSkillIds: string[];
  retentionDueSkillIds: string[];
  nextEligibleSkillIds: string[];
  preservedCompletedActivities: number;
  preservedCompletedSessions: number;
  preservedNotesCount: number;
  proposedActions: AdaptiveAdjustmentProposalItem[];
  requiresLearnerConfirmation: true;
  summary: string;
}

function daysBetweenISO(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = toISO.slice(0, 10).split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return 0;
  return Math.max(0, Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000));
}

/**
 * Deterministic adaptive learning engine.
 * Generates transparent, evidence-backed recommendations strictly from verified performance,
 * prerequisite readiness, retention intervals, and study schedule records.
 */
export function evaluateAdaptiveRules(input: AdaptiveEvaluationInput): AdaptiveEvaluationOutput {
  const {
    learnerId,
    todayISO,
    learnerSkills,
    assessmentAttempts,
    quizAttempts,
    studySessions,
    learningPaths,
    schedules = [],
    prerequisites = [],
    skills = [],
    preferredFormat,
    domainConfigs = {},
  } = input;

  const now = new Date().toISOString();
  const recommendations: Recommendation[] = [];
  let shouldRecalculateSchedule = false;
  let recommendedDifficultyShift: 'easier' | 'maintain' | 'harder' = 'maintain';

  const skillMetaMap = new Map(skills.map((s) => [s.id, s]));
  const lsBySkill = new Map(learnerSkills.map((ls) => [ls.skillId, ls]));
  const domainOf = (skillId: string | null | undefined): string | null =>
    skillId ? skillMetaMap.get(skillId)?.domainId ?? null : null;

  const scoresBySkill = new Map<string, number[]>();
  for (const att of assessmentAttempts) {
    for (const [skillId, breakdown] of Object.entries(att.skillBreakdown)) {
      const arr = scoresBySkill.get(skillId) ?? [];
      arr.push(breakdown.scorePercent);
      scoresBySkill.set(skillId, arr);
    }
  }
  for (const qa of quizAttempts) {
    const arr = scoresBySkill.get(qa.skillId) ?? [];
    arr.push(qa.scorePercent);
    scoresBySkill.set(qa.skillId, arr);
  }

  // Rule 1: Repeatedly low quiz/assessment results trigger revision & easier pacing
  for (const [skillId, scores] of scoresBySkill.entries()) {
    const lowCount = scores.filter((s) => s < 60).length;
    const latest = scores[scores.length - 1] ?? 100;
    if (lowCount >= 2 || latest < 50) {
      recommendedDifficultyShift = 'easier';
      recommendations.push({
        id: `rec_low_${skillId}`,
        learnerId,
        trigger: 'repeated_low_scores',
        recommendationType: 'revisit_weak_topic',
        targetDomainId: domainOf(skillId),
        title: `Focused Revision Needed: ${skillMetaMap.get(skillId)?.name ?? skillId}`,
        rationale: `Detected ${lowCount} low-scoring attempt(s) under 60% (latest score: ${latest}%). Stepping difficulty down and revisiting core concepts before advancing.`,
        supportingEvidence: [
          `Verified scores for ${skillId}: ${scores.join('%, ')}%`,
          `Latest score: ${latest}% (< 60% threshold)`,
        ],
        aiExplanation: null,
        targetSkillId: skillId,
        suggestedAction: 'Review Learning Library foundational notes and complete guided practice.',
        priority: 'high',
        requiresConfirmation: false,
        status: 'pending',
        dismissed: false,
        createdAt: now,
      });
    }
  }

  // Rule 2: Overconfidence vs demonstrated competence triggers activity format adjustment
  for (const ls of learnerSkills) {
    if (ls.assessmentCount > 0 && ls.selfReportedConfidence - ls.demonstratedCompetence >= 25) {
      recommendations.push({
        id: `rec_format_${ls.skillId}`,
        learnerId,
        trigger: 'activity_format_shift',
        recommendationType: 'adjust_activity_type',
        targetDomainId: domainOf(ls.skillId),
        title: `Switch Study Format for ${skillMetaMap.get(ls.skillId)?.name ?? ls.skillId}`,
        rationale: `Self-reported confidence (${ls.selfReportedConfidence}%) exceeds verified competence (${ls.demonstratedCompetence}%). Passive review alone is insufficient.`,
        supportingEvidence: [
          `Confidence: ${ls.selfReportedConfidence}% vs Verified Competence: ${ls.demonstratedCompetence}%`,
          `Preferred format: ${preferredFormat ?? 'mixed'}`,
        ],
        aiExplanation: null,
        targetSkillId: ls.skillId,
        suggestedAction: 'Shift from passive reading to hands-on practical/case-study exercises or active recall.',
        priority: 'medium',
        requiresConfirmation: true,
        status: 'pending',
        dismissed: false,
        createdAt: now,
      });
    }
  }

  // Rule 3: Consistent mastery (>= 85% across >= 2 verified attempts) unlocks higher difficulty
  const highMasterySkills = Array.from(scoresBySkill.entries()).filter(
    ([, scores]) => scores.length >= 2 && scores.slice(-2).every((s) => s >= 85),
  );
  if (highMasterySkills.length > 0 && recommendedDifficultyShift !== 'easier') {
    recommendedDifficultyShift = 'harder';
    const [topSkill, scores] = highMasterySkills[0]!;
    recommendations.push({
      id: `rec_mastery_${topSkill}`,
      learnerId,
      trigger: 'consistent_mastery',
      recommendationType: 'adjust_difficulty',
      targetDomainId: domainOf(topSkill),
      title: `Ready for Advanced Challenge: ${skillMetaMap.get(topSkill)?.name ?? topSkill}`,
      rationale: `Consistent scores >= 85% across multiple verified attempts demonstrate strong mastery.`,
      supportingEvidence: [`Recent verified scores: ${scores.slice(-2).join('%, ')}%`],
      aiExplanation: null,
      targetSkillId: topSkill,
      suggestedAction: 'Advance to higher-difficulty assessment items and applied projects.',
      priority: 'medium',
      requiresConfirmation: false,
      status: 'pending',
      dismissed: false,
      createdAt: now,
    });
  }

  // Rule 4: Insufficient assessment evidence (single borderline attempt or pending review)
  for (const ls of learnerSkills) {
    if (ls.assessmentCount === 1 && ls.demonstratedCompetence >= 50 && ls.demonstratedCompetence < 75) {
      recommendations.push({
        id: `rec_evidence_${ls.skillId}`,
        learnerId,
        trigger: 'insufficient_evidence',
        recommendationType: 'repeat_assessment',
        targetDomainId: domainOf(ls.skillId),
        title: `Collect Additional Evidence: ${skillMetaMap.get(ls.skillId)?.name ?? ls.skillId}`,
        rationale: `Only 1 borderline assessment (${ls.demonstratedCompetence}%) is recorded. Confirm mastery with a short follow-up assessment before marking strong.`,
        supportingEvidence: [`Assessment count: 1`, `Verified competence: ${ls.demonstratedCompetence}%`],
        aiExplanation: null,
        targetSkillId: ls.skillId,
        suggestedAction: 'Take a topic quiz or mixed assessment to verify mastery.',
        priority: 'medium',
        requiresConfirmation: true,
        status: 'pending',
        dismissed: false,
        createdAt: now,
      });
    }
  }
  if (assessmentAttempts.some((a) => a.completionStatus === 'pending_review')) {
    recommendations.push({
      id: `rec_pending_review`,
      learnerId,
      trigger: 'insufficient_evidence',
      recommendationType: 'repeat_assessment',
      targetDomainId: null,
      title: 'Complete Manual / Pending Review Items',
      rationale: 'One or more descriptive, practical, or case-study assessment items still require self/rubric review.',
      supportingEvidence: ['Attempt completion status includes pending_review'],
      aiExplanation: null,
      targetSkillId: null,
      suggestedAction: 'Review rubric criteria on Assessment Results and verify your mastery evidence.',
      priority: 'medium',
      requiresConfirmation: false,
      status: 'pending',
      dismissed: false,
      createdAt: now,
    });
  }

  // Rule 5: Retention & revision interval estimation
  const retentionDueSkills: string[] = [];
  const lastRevisionBySkill = new Map<string, string>();
  for (const sess of studySessions) {
    if (sess.sessionType === 'revision' && sess.status === 'completed') {
      const prev = lastRevisionBySkill.get(sess.skillId);
      if (!prev || sess.dateISO > prev) lastRevisionBySkill.set(sess.skillId, sess.dateISO);
    }
  }
  for (const ls of learnerSkills) {
    if (ls.assessmentCount === 0 || !ls.lastAssessedAt) continue;
    const domId = domainOf(ls.skillId) ?? 'general';
    const windowDays = domainConfigs[domId]?.retentionWindowDays ?? 14;
    const effectiveWindow = ls.demonstratedCompetence < 75 ? Math.max(5, Math.floor(windowDays * 0.5)) : windowDays;
    const lastRev = lastRevisionBySkill.get(ls.skillId);
    const refDate = lastRev && lastRev > ls.lastAssessedAt.slice(0, 10) ? lastRev : ls.lastAssessedAt.slice(0, 10);
    const elapsed = daysBetweenISO(refDate, todayISO);
    if (elapsed >= effectiveWindow) {
      retentionDueSkills.push(ls.skillId);
      recommendations.push({
        id: `rec_retention_${ls.skillId}`,
        learnerId,
        trigger: 'retention_review_due',
        recommendationType: 'schedule_revision',
        targetDomainId: domainOf(ls.skillId),
        title: `Estimated Revision Due: ${skillMetaMap.get(ls.skillId)?.name ?? ls.skillId}`,
        rationale: `Estimate based on recorded dates: ${elapsed} days elapsed since last verified review (${refDate}, threshold ${effectiveWindow}d).`,
        supportingEvidence: [
          `Last recorded assessment/revision: ${refDate}`,
          `Estimated review interval: ${effectiveWindow} days (derived from competence ${ls.demonstratedCompetence}%)`,
        ],
        aiExplanation: null,
        targetSkillId: ls.skillId,
        suggestedAction: 'Schedule a spaced revision block and quick recall quiz (learner confirmation optional).',
        priority: ls.demonstratedCompetence < 70 ? 'high' : 'medium',
        requiresConfirmation: true,
        status: 'pending',
        dismissed: false,
        createdAt: now,
      });
    }
  }

  // Rule 6: Missed deadlines & unrealistic schedule warnings
  const overdueSessions = studySessions.filter(
    (s) => s.sessionType !== 'break' && s.status !== 'completed' && s.status !== 'skipped' && s.dateISO < todayISO,
  );
  if (overdueSessions.length >= 2) {
    shouldRecalculateSchedule = true;
    recommendations.push({
      id: `rec_missed_${todayISO}`,
      learnerId,
      trigger: 'missed_deadlines',
      recommendationType: 'revise_goal',
      targetDomainId: domainOf(overdueSessions[0]?.skillId),
      title: `Reschedule ${overdueSessions.length} Overdue / Postponed Session(s)`,
      rationale: `${overdueSessions.length} unfinished study sessions fall before ${todayISO}. Adaptive rescheduling moves unfinished work without deleting completed history.`,
      supportingEvidence: [`Unfinished sessions before ${todayISO}: ${overdueSessions.length}`],
      aiExplanation: null,
      targetSkillId: overdueSessions[0]?.skillId ?? null,
      suggestedAction: 'Preview and confirm adaptive schedule revision in the Study Planner.',
      priority: 'high',
      requiresConfirmation: true,
      status: 'pending',
      dismissed: false,
      createdAt: now,
    });
  }

  const unrealisticSchedule = schedules.find((sc) => !sc.isRealistic && sc.feasibilityWarning);
  if (unrealisticSchedule) {
    shouldRecalculateSchedule = true;
    recommendations.push({
      id: `rec_goal_revise_${unrealisticSchedule.id}`,
      learnerId,
      trigger: 'unrealistic_goal_revision',
      recommendationType: 'revise_goal',
      targetDomainId: null,
      title: 'Revise Target Deadline or Daily Study Capacity',
      rationale: unrealisticSchedule.feasibilityWarning!,
      supportingEvidence: [
        `Planned workload: ${unrealisticSchedule.totalPlannedHours}h at ${unrealisticSchedule.dailyAvailableMinutes} min/day`,
      ],
      aiExplanation: null,
      targetSkillId: null,
      suggestedAction: 'Extend target completion date, increase study hours, or adjust goal priority.',
      priority: 'high',
      requiresConfirmation: true,
      status: 'pending',
      dismissed: false,
      createdAt: now,
    });
  }

  // Rule 7: Completed milestones trigger readiness check for next milestone
  for (const path of learningPaths) {
    for (const stage of path.stages) {
      const completedMilestones = stage.milestones.filter((m) => m.status === 'completed');
      const nextMilestone = stage.milestones.find((m) => m.status !== 'completed');
      if (completedMilestones.length > 0 && nextMilestone) {
        recommendations.push({
          id: `rec_milestone_${nextMilestone.id}`,
          learnerId,
          trigger: 'milestone_completed',
          recommendationType: 'advance_next_skill',
          targetDomainId: domainOf(nextMilestone.skillIds[0]),
          title: `Verify Readiness for "${nextMilestone.title}"`,
          rationale: `Previous milestone completed. Confirm prerequisite mastery before starting the next milestone.`,
          supportingEvidence: [`Completed milestones in stage: ${completedMilestones.length}`],
          aiExplanation: null,
          targetSkillId: nextMilestone.skillIds[0] ?? null,
          suggestedAction: 'Complete milestone readiness checkpoint.',
          priority: 'medium',
          requiresConfirmation: false,
          status: 'pending',
          dismissed: false,
          createdAt: now,
        });
        break;
      }
    }
  }

  // Rule 8: Weak demonstrated competence triggers practical reinforcement
  const weakSkills = learnerSkills.filter((ls) => ls.assessmentCount > 0 && ls.status === 'weak');
  for (const ws of weakSkills.slice(0, 2)) {
    recommendations.push({
      id: `rec_practical_${ws.skillId}`,
      learnerId,
      trigger: 'weak_practical_performance',
      recommendationType: 'additional_practice',
      targetDomainId: domainOf(ws.skillId),
      title: `Build Guided Practice Exercises: ${skillMetaMap.get(ws.skillId)?.name ?? ws.skillId}`,
      rationale: `Demonstrated competence is ${ws.demonstratedCompetence}% (weak band < 75%). Applied practice strengthens foundational recall.`,
      supportingEvidence: [`Demonstrated competence: ${ws.demonstratedCompetence}%`],
      aiExplanation: null,
      targetSkillId: ws.skillId,
      suggestedAction: 'Open applied exercises and practice prompts in the Learning Library.',
      priority: 'medium',
      requiresConfirmation: false,
      status: 'pending',
      dismissed: false,
      createdAt: now,
    });
  }

  // Rule 9: Unassessed skills & prerequisite gating
  const unassessed = learnerSkills.filter((ls) => ls.assessmentCount === 0);
  if (unassessed.length > 0 && assessmentAttempts.length === 0) {
    recommendations.push({
      id: `rec_baseline_${unassessed[0]!.skillId}`,
      learnerId,
      trigger: 'unassessed_prerequisites',
      recommendationType: 'repeat_assessment',
      targetDomainId: domainOf(unassessed[0]!.skillId),
      title: 'Complete Baseline Diagnostic Assessment',
      rationale: `${unassessed.length} target/prerequisite skill(s) have no verified assessment evidence yet.`,
      supportingEvidence: [`Unassessed skills count: ${unassessed.length}`],
      aiExplanation: null,
      targetSkillId: unassessed[0]!.skillId,
      suggestedAction: 'Take the Diagnostic Skill Assessment to calibrate your roadmap.',
      priority: 'high',
      requiresConfirmation: false,
      status: 'pending',
      dismissed: false,
      createdAt: now,
    });
  }

  const delayedAdvancedSkills: string[] = [];
  const nextEligibleSkills: string[] = [];

  for (const path of learningPaths) {
    for (const stage of path.stages) {
      for (const m of stage.milestones) {
        if (m.status === 'completed') continue;
        if (m.prerequisiteSkillIds.length === 0) {
          for (const sid of m.skillIds) {
            const ls = lsBySkill.get(sid);
            if (!ls || ls.assessmentCount === 0 || ls.demonstratedCompetence < 75) {
              if (!nextEligibleSkills.includes(sid)) nextEligibleSkills.push(sid);
            }
          }
          continue;
        }
        const incompletePrereq = m.prerequisiteSkillIds.find((pid) => {
          const ls = lsBySkill.get(pid);
          return !ls || ls.assessmentCount === 0 || ls.demonstratedCompetence < 65;
        });
        if (incompletePrereq) {
          for (const sid of m.skillIds) {
            if (!delayedAdvancedSkills.includes(sid)) delayedAdvancedSkills.push(sid);
          }
        } else {
          for (const sid of m.skillIds) {
            const ls = lsBySkill.get(sid);
            if (!ls || ls.assessmentCount === 0 || ls.demonstratedCompetence < 75) {
              if (!nextEligibleSkills.includes(sid)) nextEligibleSkills.push(sid);
            }
          }
        }
      }
    }
  }

  // Also check explicit prerequisites list if skills without active paths are unlocked
  for (const sk of skills) {
    const ls = lsBySkill.get(sk.id);
    if (ls && ls.assessmentCount > 0 && ls.demonstratedCompetence >= 75) continue;
    const reqs = prerequisites.filter((p) => p.skillId === sk.id && p.strictness === 'required');
    if (reqs.length > 0) {
      const allMet = reqs.every((r) => {
        const pls = lsBySkill.get(r.prerequisiteSkillId);
        return Boolean(pls && pls.assessmentCount > 0 && pls.demonstratedCompetence >= 65);
      });
      if (allMet && !nextEligibleSkills.includes(sk.id)) {
        nextEligibleSkills.push(sk.id);
      }
    }
  }

  if (delayedAdvancedSkills.length > 0) {
    recommendations.push({
      id: `rec_delay_${delayedAdvancedSkills[0]}`,
      learnerId,
      trigger: 'unassessed_prerequisites',
      recommendationType: 'review_prerequisite',
      targetDomainId: domainOf(delayedAdvancedSkills[0]),
      title: `Prerequisite Gate Active (${delayedAdvancedSkills.length} topic(s) held)`,
      rationale: `Advanced topic(s) (${delayedAdvancedSkills.join(', ')}) remain gated until prerequisite mastery reaches >= 65%.`,
      supportingEvidence: [`Blocked topics awaiting prerequisites: ${delayedAdvancedSkills.join(', ')}`],
      aiExplanation: null,
      targetSkillId: delayedAdvancedSkills[0] ?? null,
      suggestedAction: 'Complete foundational prerequisite milestones and verify via assessment first.',
      priority: 'high',
      requiresConfirmation: false,
      status: 'pending',
      dismissed: false,
      createdAt: now,
    });
  }

  if (nextEligibleSkills.length > 0 && recommendations.length === 0) {
    recommendations.push({
      id: `rec_next_${nextEligibleSkills[0]}`,
      learnerId,
      trigger: 'next_eligible_skill',
      recommendationType: 'advance_next_skill',
      targetDomainId: domainOf(nextEligibleSkills[0]),
      title: `Next Unlocked Skill Ready: ${skillMetaMap.get(nextEligibleSkills[0]!)?.name ?? nextEligibleSkills[0]}`,
      rationale: 'All required prerequisites meet verified mastery thresholds.',
      supportingEvidence: [`Eligible unlocked skill: ${nextEligibleSkills[0]}`],
      aiExplanation: null,
      targetSkillId: nextEligibleSkills[0]!,
      suggestedAction: 'Proceed to the next milestone in your active roadmap.',
      priority: 'low',
      requiresConfirmation: false,
      status: 'pending',
      dismissed: false,
      createdAt: now,
    });
  }

  return {
    recommendations,
    shouldRecalculateSchedule,
    recommendedDifficultyShift,
    delayedAdvancedSkills,
    nextEligibleSkills,
    retentionDueSkills,
  };
}

/**
 * Generates a non-destructive preview of proposed roadmap and study schedule adjustments
 * before any user confirmation mutates saved plans.
 */
export function previewAdaptivePlanAdjustments(params: {
  learnerId: string;
  todayISO: string;
  learnerSkills: LearnerSkill[];
  assessmentAttempts: AssessmentAttempt[];
  quizAttempts: QuizAttempt[];
  studySessions: StudySession[];
  learningPaths: LearningPath[];
  schedules?: StudySchedule[];
  skills?: Skill[];
}): AdaptivePlanAdjustmentPreview {
  const evalOut = evaluateAdaptiveRules({
    learnerId: params.learnerId,
    todayISO: params.todayISO,
    learnerSkills: params.learnerSkills,
    assessmentAttempts: params.assessmentAttempts,
    quizAttempts: params.quizAttempts,
    studySessions: params.studySessions,
    learningPaths: params.learningPaths,
    schedules: params.schedules,
    skills: params.skills,
  });

  const skillMetaMap = new Map((params.skills ?? []).map((s) => [s.id, s]));
  const newlyMasteredSkillIds = params.learnerSkills
    .filter((ls) => ls.assessmentCount > 0 && ls.status === 'strong')
    .map((ls) => ls.skillId);
  const persistentWeakSkillIds = params.learnerSkills
    .filter((ls) => ls.assessmentCount > 0 && (ls.status === 'weak' || ls.status === 'missing'))
    .map((ls) => ls.skillId);

  let preservedCompletedActivities = 0;
  for (const p of params.learningPaths) {
    for (const st of p.stages) {
      for (const m of st.milestones) {
        for (const a of m.activities) {
          if (a.status === 'completed') preservedCompletedActivities += 1;
        }
      }
    }
  }
  const preservedCompletedSessions = params.studySessions.filter(
    (s) => s.status === 'completed' || s.status === 'partially_completed',
  ).length;
  const preservedNotesCount = params.studySessions.filter((s) => s.notes.trim().length > 0).length;

  const proposedActions: AdaptiveAdjustmentProposalItem[] = [];
  for (const sid of evalOut.retentionDueSkills) {
    proposedActions.push({
      id: `prop_rev_${sid}`,
      kind: 'insert_revision_session',
      targetSkillId: sid,
      targetDomainId: skillMetaMap.get(sid)?.domainId ?? null,
      description: `Schedule spaced recall revision for ${skillMetaMap.get(sid)?.name ?? sid}`,
      rationale: 'Estimated retention interval elapsed without recent verified recall.',
    });
  }
  for (const sid of persistentWeakSkillIds.slice(0, 3)) {
    proposedActions.push({
      id: `prop_weak_${sid}`,
      kind: 'reprioritize_milestone',
      targetSkillId: sid,
      targetDomainId: skillMetaMap.get(sid)?.domainId ?? null,
      description: `Prioritize remedial practice for weak skill ${skillMetaMap.get(sid)?.name ?? sid}`,
      rationale: 'Demonstrated competence remains below 75% mastery threshold.',
    });
  }
  if (evalOut.shouldRecalculateSchedule) {
    proposedActions.push({
      id: 'prop_resched',
      kind: 'reschedule_missed_sessions',
      targetSkillId: null,
      targetDomainId: null,
      description: 'Relocate unfinished overdue/postponed sessions into future available slots',
      rationale: 'Keeps daily study budget realistic while preserving all completed sessions.',
    });
  }
  for (const sid of evalOut.nextEligibleSkills.slice(0, 2)) {
    proposedActions.push({
      id: `prop_unlock_${sid}`,
      kind: 'unlock_next_skill',
      targetSkillId: sid,
      targetDomainId: skillMetaMap.get(sid)?.domainId ?? null,
      description: `Advance to unlocked skill ${skillMetaMap.get(sid)?.name ?? sid}`,
      rationale: 'All required prerequisite skills meet verified competence >= 65%.',
    });
  }

  return {
    suggestedDifficultyShift: evalOut.recommendedDifficultyShift,
    newlyMasteredSkillIds,
    persistentWeakSkillIds,
    delayedSkillIds: evalOut.delayedAdvancedSkills,
    retentionDueSkillIds: evalOut.retentionDueSkills,
    nextEligibleSkillIds: evalOut.nextEligibleSkills,
    preservedCompletedActivities,
    preservedCompletedSessions,
    preservedNotesCount,
    proposedActions,
    requiresLearnerConfirmation: true,
    summary: `${proposedActions.length} proposed adaptive adjustment(s); preserves ${preservedCompletedActivities} completed activity(ies), ${preservedCompletedSessions} study session(s), and ${preservedNotesCount} note(s).`,
  };
}
