# ASSESSMENT ENGINE (`@alc/assessment-engine`)

## Responsibilities
- Evaluates diagnostic and topic MCQs deterministically (`evaluateAssessmentSubmission`, `evaluateQuizAttempt`).
- Tracks per-question timing (`timeSpentSeconds`), confidence ratings (`1–5`), and deduplicates malformed duplicate responses.
- Separates self-reported confidence from demonstrated competence and computes calibration discrepancies (`overconfident`, `underconfident`, `calibrated`).
- Updates `LearnerSkill` mastery estimates (`0–100`) and classifications (`strong >= 75`, `weak 45–74`, `missing < 45`, `unassessed`).
- Identifies prioritized weak topics (`identifyWeakTopics`).
