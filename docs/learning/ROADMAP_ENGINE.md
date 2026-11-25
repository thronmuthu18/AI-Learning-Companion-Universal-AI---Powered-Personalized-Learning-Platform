# PERSONALIZED ROADMAP ENGINE (`@alc/learning-engine`)

## Responsibilities
- Maintains `DomainRegistry` (`defaultDomainRegistry`) with **30 universal knowledge domains**, hierarchical categories/subjects/topics/subtopics, domain-agnostic skills (`UNIVERSAL_SKILLS`), DAG prerequisites (`UNIVERSAL_PREREQUISITES`), `AssessmentBlueprint`s, and multi-domain `GOAL_TEMPLATES` (GATE ECE, Python, Business Accounting, Physics, Competitive Exams, Software, AI/ML, Security, Custom).
- Supports runtime registration (`registerDomainBundle`) of new domains, subjects, skills, and prerequisites without modifying core engine code.
- Analyzes skill gaps (`analyzeSkillGap`) across arbitrary skill subgraphs categorizing `strong`, `weak`, `missing`, `unassessed`, `recommendedNext`, and `blockedSkills`.
- Generates personalised 3-stage roadmaps (`buildPersonalizedLearningPath`) selecting modality-appropriate learning activities (`numerical`, `coding`, `case_study`, `descriptive`, `practical`, `flashcard`, `revision`, `mcq`) from each skill and `AssessmentBlueprint`—explicitly rejecting cyclic graphs or empty target sets.
