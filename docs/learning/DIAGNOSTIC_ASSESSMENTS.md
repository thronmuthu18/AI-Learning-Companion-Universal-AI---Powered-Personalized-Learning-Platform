# DIAGNOSTIC ASSESSMENTS & ADAPTIVE SELECTION (Phase 10)

## Domain-Scoped Diagnostics
`buildGoalScopedDiagnostic` (`@alc/resource-management`) constructs diagnostics tailored to the learner's active goal/domain skills instead of forcing a fixed CS question set, covering GATE ECE, Physics, Business Accounting, Python, Competitive Exams, Graphic Design, and Software/AI.

## Adaptive Question Selection (`selectAdaptiveNextQuestion`)
- Tracks per-question elapsed time (`timeSpentSeconds`), `confidenceRating` (`1–5`), and recent accuracy.
- Steps up to `'advanced'` when recent accuracy reaches `>= 80%`, maintains `'intermediate'` on moderate accuracy, and steps down to `'beginner'` when accuracy drops below `55%`.
- Separates self-reported confidence from verified assessment mastery (`AssessmentAttempt.scorePercent` and `LearnerSkill.demonstratedCompetence`).
