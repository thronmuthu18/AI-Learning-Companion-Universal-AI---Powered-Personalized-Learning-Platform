# CONFIDENCE CALIBRATION & WEAK-AREA ANALYSIS (Phase 10)

## Discrepancy & Adaptive Rules (`computeAdaptiveAssessmentPlan`)
- **Misconception Detection:** Flags skills where learners reported high confidence (`4–5`) on wrong answers (`misconceptionFlags`).
- **Confidence Reinforcement:** Flags skills where learners reported low confidence (`1–2`) on correct answers (`reinforcementFlags`).
- **Repeated Mistakes:** Tracks skills scoring `< 65%` across multiple attempts (`targetedRevisionSkills`).
- **Mastery Classification:** `classifySkillMastery` designates `strong (>= 75%)`, `weak (45–74%)`, `missing (< 45%)`, and `unassessed (assessmentCount === 0)`, never equating confidence scores with demonstrated competence.
