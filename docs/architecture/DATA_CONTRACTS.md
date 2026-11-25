# SHARED DATA CONTRACTS — AI Learning Companion

## Domain Entities (`@alc/shared-types`) & Runtime Validation (`@alc/validation`)

| Domain Area | TypeScript Types | Zod Runtime Validation |
|---|---|---|
| Learner & Profile | `Learner`, `LearnerProfile`, `ProfileHistoryEntry` | `LearnerSchema`, `LearnerProfileSchema`, `LearnerProfileInputSchema`, `LearningPreferencesInputSchema` |
| Universal Taxonomy | `DomainDefinition`, `DomainCategory`, `SubjectDefinition`, `TopicDefinition`, `SubtopicDefinition`, `AssessmentBlueprint`, `ContentAvailabilityStatus` | Dynamic `DomainRegistry` & honest availability metadata |
| Goals | `LearningGoal`, `GoalCategory` (open string across any domain), optional `domainId` / `subjectId` | `LearningGoalSchema`, `GoalCategorySchema`, `AIGoalInterpretationSchema` |
| Skills & Assessments | `Skill`, `SkillPrerequisite`, `LearnerSkill`, `Assessment`, `AssessmentAttempt`, `AssessmentAnswer`, `AssessmentQuestionType` (`mcq`, `numerical`, `descriptive`, `coding`, `practical`, `case_study`, `flashcard`) | `LearnerSkillSchema`, `AssessmentAttemptSchema`, `AssessmentAnswerSchema` |
| Roadmaps & Schedules | `LearningPath`, `LearningStage`, `LearningMilestone`, `LearningActivity`, `StudySchedule`, `StudySession`, `StudyTechnique`, `StudyScheduleMode`, `StudyBreakConfig`, `ScheduleConflict` | `LearningPathSchema`, `StudyScheduleSchema`, `StudySessionSchema`, `CompletionStatusSchema` |
| Resources & Quizzes | `LearningResource`, `Quiz`, `QuizQuestion`, `QuizAttempt` | `LearningResourceSchema`, `QuizAttemptSchema` |
| Progress & Adaptation | `ProgressRecord`, `DomainProgressConfig`, `DomainProgressBreakdown`, `GoalProgressBreakdown`, `TopicProgressBreakdown`, `SkillProgressBreakdown`, `RetentionEstimate`, `ProgressHistorySnapshot`, `Recommendation`, `RecommendationTrigger`, `AdaptiveRecommendationType` | `ProgressRecordSchema`, `RecommendationSchema` |
| Local AI & Diagnostics | `LocalAIProvider`, `AICapabilities`, `ModelStatusSnapshot`, `ModelDeviceDiagnostics`, `AIGenerateRequest`, `AIGenerateResponse` | `AISkillGapExplanationSchema`, `AIRoadmapAdvisorySchema`, `AITutorResponseSchema` |
| Cross-Platform Backup | `BackupMetadata`, `BackupEnvelope` | `BackupEnvelopeSchema`, `validateBackupSize`, `hasUnsafePrototypeKeys` |
