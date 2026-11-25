# LEARNING ROADMAP GENERATOR (`@alc/learning-engine`, Phase 12)

## Domain-Independent Roadmap Synthesis (`buildPersonalizedLearningPath`)
Generates personalised 3-stage pathways (`Foundations -> Core Competencies -> Applied Mastery`) tailored to:
- Active goals (`targetSkillIds`, `expectedProficiency`, `targetCompletionDate`) and multi-goal priority budgets (`allocatedWeeklyHours`)
- Learner profile (`academicLevel`, `preferredFormat`, `preferredLanguage`, `availableHoursPerDay`, `studyDaysPerWeek`)
- Verified assessment competence (`LearnerSkill` mastery vs self-reported confidence)
- Transitive prerequisite readiness (`SkillGraph.checkReadiness` marking milestones `'ready'`, `'blocked'`, or `'completed'`)
- Domain-specific learning activities (`lesson`, `numerical`, `coding`, `case_study`, `practical`, `descriptive`, `flashcard`, `revision`, `video_audio`, `project`, `mcq`) with explicit scheduling `reason` strings and realistic `deadlineStatus` checks.
