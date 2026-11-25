# SCORING AND EVALUATION ARCHITECTURE (Phase 10)

## Deterministic & Honest Grading
- **Objective items (`mcq`, `multiple_select`, `conceptual`, `scenario`):** Deterministically scored with partial credit calculation on multi-select answers.
- **Numerical items (`numerical`):** Evaluates `|submitted - expected| <= numericTolerance` and validates normalized units (`ohm`/`ohms`/`ω`, `N`/`newton`, `INR`/`Rs`, `km/h`). Magnitude within tolerance with an incorrect/missing unit awards 50% credit and explicit unit feedback.
- **Open responses (`descriptive`, `short_answer`, `case_study`, `practical`):** Evaluates manual rubric points (`manualRubricScores`), verified real local Llama rubric output (never fabricated), or deterministic rubric keyword coverage—falling back cleanly to `completionStatus: 'pending_review'` when ungraded.
- **Coding exercises (`coding`):** Verified via declarative static test patterns (`codingTestCases`) without invoking `eval()` or running untrusted code inside the host app process.
