# DATABASE SCHEMA SPECIFICATION — AI Learning Companion

## 1. Unified Logical Entities (`Schema Version 2`)
Both Web (IndexedDB) and Mobile (Android & iOS SQLite via `expo-sqlite`) store identical TypeScript domain entities across 15 stores/tables:
1. `learners`
2. `learner_profiles` (FK -> `learners.id` ON DELETE CASCADE)
3. `learning_goals` (FK -> `learners.id`, indexed on `(learner_id, is_active)`)
4. `learner_skills` (FK -> `learners.id`, unique index on `(learner_id, skill_id)`)
5. `assessment_attempts` (FK -> `learners.id`, indexed on `(learner_id, completed_at)`)
6. `assessment_answers` (FK -> `assessment_attempts.id` ON DELETE CASCADE)
7. `learning_paths` (FK -> `learners.id`)
8. `study_schedules` (FK -> `learners.id`)
9. `study_sessions` (FK -> `study_schedules.id` & `learners.id`, indexed on `(learner_id, date_iso)`)
10. `progress_records` (FK -> `learners.id`, indexed on `(learner_id, date_iso)`)
11. `recommendations` (FK -> `learners.id`, indexed on `(learner_id, dismissed)`)
12. `quiz_attempts` (FK -> `learners.id`, indexed on `(learner_id, skill_id)`)
13. `user_resources`
14. `model_downloads`
15. `app_settings`

## 2. Web IndexedDB Secondary Indexes (`ai_learning_companion_db` v2)
- `learning_goals.by_learner`
- `learner_skills.by_skill`
- `assessment_attempts.by_learner`
- `assessment_answers.by_attempt`
- `learning_paths.by_goal`
- `study_sessions.by_schedule`, `study_sessions.by_date`
- `progress_records.by_date`
- `recommendations.by_learner`
- `quiz_attempts.by_skill`
- `user_resources.by_skill`
