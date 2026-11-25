# LEARNER ONBOARDING & PROFILE MANAGEMENT (Module A — Phase 08)

## 1. Local Offline-First Architecture
AI Learning Companion manages learner accounts and profiles 100% locally on-device with zero dependency on any remote authentication server:
- **Web PWA:** Persisted in IndexedDB (`learners` & `learner_profiles` object stores) via `IndexedDBLearningRepository`.
- **Android & iOS:** Persisted in local SQLite (`learners` & `learner_profiles` tables with `ON DELETE CASCADE`) via `SQLiteLearningRepository`.
- **Validation:** Every onboarding create and profile edit passes through `LearnerProfileInputSchema` and `sanitizeTextInput` (`@alc/validation`).

## 2. Shared Onboarding & Profile Service (`@alc/learning-engine`)
Reused by both `apps/web` (`AppContext.saveProfile`) and `apps/mobile` (`MobileContext.saveProfile`):
- `buildLearnerAndProfileUpdate(...)`: Normalizes and clamps profile data (`availableHoursPerDay`, `studyDaysPerWeek`, `sessionLengthMinutes`, `revisionFrequencyDays`), preserves prior preferences when omitted, builds the `ProfileHistoryEntry` diff, and emits newly seeded `'unassessed'` skills.
- `diffProfileChanges(...)`: Tracks field-level modifications across `displayName`, `educationalBackground`, `academicLevel`, `interests`, `careerAspirations`, `selfReportedSkills`, `targetSkills`, `availableHoursPerDay`, `studyDaysPerWeek`, `preferredFormat`, `preferredLanguage`, `targetCompletionDate`, and `learningPreferences`.
- `seedUnassessedSkillsForProfile(...)`: Seeds `'unassessed'` `LearnerSkill` entries (`assessmentCount: 0`, `demonstratedCompetence: 0`) for self-reported skills across any domain without overwriting existing assessment-verified scores.
- `computeOnboardingCompleteness(...)`: Computes persisted completeness percentage, checklist status, and weekly study hours budget (`availableHoursPerDay * studyDaysPerWeek`).

## 3. Optional Future Account Synchronisation
For multi-device portability today without adding any cloud dependency:
- Learners can export their full state (including `Learner`, `LearnerProfile` history, `LearnerSkill` baselines, and goals) using the SHA-256 verified JSON `BackupEnvelope` (`@alc/storage`) and restore it cleanly across Web, Android, and iOS.
- Any future optional cloud account sync should remain strictly opt-in and encrypt serialized `BackupEnvelope` payloads client-side before upload, keeping offline local storage authoritative.
