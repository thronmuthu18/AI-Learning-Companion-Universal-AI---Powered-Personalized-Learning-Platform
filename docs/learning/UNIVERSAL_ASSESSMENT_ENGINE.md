# UNIVERSAL ASSESSMENT ENGINE (`@alc/assessment-engine`)

## Domain-Independent Design
The assessment engine evaluates skill competence identically across all knowledge domains (Engineering, Sciences, Mathematics, Business & Accounting, Competitive Exams, Design, Humanities, Healthcare, Vocational Skills, Programming, and custom user domains).

## Supported Question & Activity Modalities
- `mcq`, `conceptual`, `scenario` — exact objective evaluation (`objective_exact`)
- `multiple_select` — partial & exact multi-option scoring (`multiple_select_partial`)
- `numerical` — configurable numeric tolerance plus normalized SI/currency/rate unit checks (`numerical_tolerance`)
- `coding` — safe declarative pattern/contract verification (`coding_static_cases`) with zero untrusted code execution in the application process
- `descriptive`, `short_answer`, `case_study`, `practical` — configurable manual rubrics (`rubric_manual`), deterministic keyword baselines (`rubric_keyword_baseline`), optional verified local Llama scoring (`local_llama_advisory`), or explicit `pending_review` without fabricating grades
- `flashcard` — active recall checks paired with confidence calibration (`flashcard_self_recall`)
