# ADAPTIVE LEARNING ENGINE (`@alc/adaptive-engine`)

## Deterministic Rule Set (`evaluateAdaptiveRules`)
1. **Repeated Low Scores (`repeated_low_scores`):** Quiz or diagnostic breakdown `< 60%` twice (or latest `< 50%`) triggers high-priority revision and shifts difficulty `'easier'`.
2. **Consistent Mastery (`consistent_mastery`):** Scores `>= 85%` across `>= 2` attempts shift difficulty `'harder'`.
3. **Missed Deadlines (`missed_deadlines`):** `>= 2` overdue uncompleted sessions set `shouldRecalculateSchedule = true`.
4. **Milestone Completed (`milestone_completed`):** Unlocks readiness verification for the next stage milestone.
5. **Weak Practical Performance (`weak_practical_performance`):** Demonstrated competence `45–74%` recommends guided applied projects.
6. **Unassessed Prerequisites (`unassessed_prerequisites`) & Prerequisite Gate (`delayedAdvancedSkills`):** Delays advanced milestones whose required prerequisites lack verified `>= 65%` competence.

Local Llama 3.2 is used solely for pedagogical explanations (`aiExplanation`) and never computes scores or rules.
