# UI/UX & NAVIGATION TECHNICAL DESIGN — AI Learning Companion

## 1. Visual Design System (`@alc/design-system`)
- **Foundations:** `#080D1A` primary background, `#0E1629` secondary surfaces, `#17233D` card surfaces, `#223154` subtle borders.
- **Accents:** `#6366F1` (Indigo), `#7C3AED` (Violet), `#3B82F6` (Blue), `#06B6D4` (Cyan).
- **Text Contrast:** `#F8FAFC` primary text and `#CBD5E1` secondary text on `#080D1A`/`#17233D` provide > 10:1 contrast ratio (WCAG AAA for body copy).
- **Status Tokens:** `#10B981` (Strong / Offline Ready / Pass), `#F59E0B` (Weak / Warning / Offline Notice), `#EF4444` (Missing / Error / Blocked).

## 2. Complete 27-Screen Navigation Mapping

| # | `AppScreenId` | Web Route (`apps/web/src/App.tsx`) | Mobile Route (`apps/mobile/app/`) | Data Backing |
|---|---|---|---|---|
| 1 | `splash` | `SplashScreen` | Root init in `app/(tabs)/index.tsx` | IndexedDB / SQLite init |
| 2 | `welcome` | `WelcomeScreen` | First-run card on `index.tsx` | WebGPU / ExecuTorch capabilities |
| 3 | `onboarding` | `OnboardingAndProfileScreen (isEditMode=false)` | `app/onboarding.tsx` | `saveLearnerAndProfile` |
| 4 | `profile` | `OnboardingAndProfileScreen (isEditMode=true)` | `app/onboarding.tsx` | `LearnerProfile` + history |
| 5 | `goals` | `GoalSelectionScreen` | `app/(tabs)/roadmap.tsx` | `GOAL_TEMPLATES` + local Llama |
| 6 | `assessment` | `SkillAssessmentScreen` | `app/assessment.tsx` | `DIAGNOSTIC_QUESTIONS` |
| 7 | `assessment_results` | `AssessmentResultsScreen` | `app/assessment.tsx` (post-submit) | `AssessmentAttempt` + discrepancies |
| 8 | `skill_gap` | `SkillGapScreen` | `app/(tabs)/roadmap.tsx` | `analyzeSkillGap` + `SkillGraph` |
| 9 | `roadmap` | `LearningRoadmapScreen` | `app/(tabs)/roadmap.tsx` | `LearningPath` (3 stages) |
| 10 | `daily_planner` | `DailyPlannerScreen` | `app/(tabs)/planner.tsx` | `getDailySessions` |
| 11 | `weekly_planner` | `WeeklyPlannerScreen` | `app/(tabs)/planner.tsx` | `getWeeklyBuckets` |
| 12 | `monthly_targets` | `MonthlyTargetsScreen` | `app/(tabs)/planner.tsx` | `getMonthlyTargets` |
| 13 | `library` | `LearningLibraryScreen` | `app/(tabs)/library.tsx` | `allResources` (`bundled` / `user_imported` / `optional_external`) |
| 14 | `content_viewer` | `ContentViewerScreen` | `app/content.tsx` | Selected `LearningResource` |
| 15 | `ai_assistant` | `AIAssistantScreen` | `app/(tabs)/assistant.tsx` | `LocalAIAdvisoryService.askTutorStream` |
| 16 | `quiz` | `QuizInterfaceScreen` | `app/quiz.tsx` | `BUNDLED_QUIZZES` |
| 17 | `quiz_results` | `QuizResultsScreen` | `app/quiz.tsx` (post-submit) | `QuizAttempt` + explanations |
| 18 | `dashboard` | `ProgressDashboardScreen` | `app/(tabs)/index.tsx` | `computeProgressMetrics` |
| 19 | `recommendations` | `AdaptiveRecommendationsScreen` | `app/(tabs)/planner.tsx` | `evaluateAdaptiveRules` |
| 20 | `history` | `LearningHistoryScreen` | `app/(tabs)/index.tsx` & `settings.tsx` | `assessmentAttempts` + `quizAttempts` |
| 21 | `model_settings` | `OfflineModelSettingsScreen` | `app/(tabs)/settings.tsx` | `getCapabilities()` + `initialize()` |
| 22 | `model_downloads` | `ModelDownloadManagementScreen` | `app/(tabs)/settings.tsx` | Cache / `.pte` picker + SHA-256 |
| 23 | `data_export` | `DataExportScreen` | `app/(tabs)/settings.tsx` | `exportSnapshotToBackup` |
| 24 | `data_import` | `DataImportScreen` | `app/(tabs)/settings.tsx` | `validateAndParseImportBackup` |
| 25 | `app_settings` | `AppSettingsScreen` | `app/(tabs)/settings.tsx` | `ApplicationSettings` |
| 26 | `privacy_settings` | `PrivacySettingsScreen` | `app/(tabs)/settings.tsx` | Local-only policy flags |
| 27 | `about` | `AboutDocumentationScreen` | `app/(tabs)/settings.tsx` | Runtime matrix + Meta Llama notice |

## 3. UI State Machines
Every AI-powered view enforces explicit `ModelLoadState` transitions (`not_installed` -> `downloading`/`loading` -> `ready` -> `generating` -> `error`/`unsupported`) and never silently degrades to cloud endpoints or canned responses.
