# REQUIREMENTS SPECIFICATION — AI Learning Companion

## 1. Product Objective
Deliver an offline-first, AI-powered personalised learning management and intelligence ecosystem across **Web (PWA)**, **Android**, and **iOS**, executing genuine **Meta Llama 3.2** models locally on-device with **zero remote LLM inference APIs**.

## 2. Non-Negotiable Technical Constraints
- **Mandatory LLM Family:** Genuine Meta Llama-family model (`Llama 3.2 1B Instruct` primary; `3B Instruct` optional on higher-RAM targets).
- **Zero Cloud LLM Inference:** Never use OpenAI, Gemini, Claude, Groq, or Hugging Face hosted inference endpoints, and never simulate or fake LLM outputs when a local runtime is unavailable.
- **Platform Runtimes:**
  - **Android:** Custom Kotlin Expo Module wrapping `org.pytorch:executorch-android:1.5.1` (`LlmModule`, XNNPACK CPU backend, `.pte` + `tokenizer.model`).
  - **iOS:** Custom Swift Expo Module wrapping `ExecuTorchLLM` (`TextLLMRunner`) via Swift Package Manager (`https://github.com/pytorch/executorch`).
  - **Web:** `@mlc-ai/web-llm` in a Web Worker over WebGPU (`Llama-3.2-1B-Instruct-q4f16_1-MLC` with `q4f32_1` fallback), Browser Cache Storage, IndexedDB, and PWA Service Worker.
- **Local Persistence:** Independent SQLite databases on Android/iOS (`expo-sqlite`), IndexedDB on Web (`idb`), and cross-platform SHA-256 verified JSON export/import (`BackupEnvelope`).

## 3. Functional Modules (A–L)
- **Module A — Learner Management:** Local onboarding, profile editing, academic level, study hours/days, target completion date, and profile change history.
- **Module B — Goal Identification:** 13 predefined domain goals plus free-text goal entry interpreted locally by Llama 3.2 and validated via Zod schemas.
- **Module C — Skill Assessment Engine:** Topic-wise & diagnostic MCQs, difficulty levels, confidence ratings (1–5), per-question timing, explanations, and strict separation of self-reported confidence vs demonstrated competence.
- **Module D — Skill Gap Analysis:** Categorizes skills (`strong`, `weak`, `missing`, `unassessed`), enforces directed acyclic prerequisite dependencies, detects circular dependencies, and prevents recommending advanced skills ahead of verified prerequisites.
- **Module E — Local Llama AI Advisory Engine:** `LocalAIProvider` contract (`initialize`, `getCapabilities`, `generate`, `generateStream`, `cancel`, `dispose`, `getModelStatus`) with schema-validated structured outputs.
- **Module F — Personalised Learning Roadmap:** Stages, milestones, activities, estimated hours, completion criteria, checkpoints, and project prompts.
- **Module G — Intelligent Study Planner:** Daily, weekly, and monthly schedules respecting daily study hour budgets, detecting unrealistic deadlines, and recalculating missed sessions.
- **Module H — Offline Learning Library:** Bundled offline lessons/exercises/quizzes separated cleanly from user-imported notes and optional external official docs (never inventing URLs).
- **Module I — Quiz & Assessment:** Topic/difficulty quizzes with instant grading, explanations, history, and retakes.
- **Module J — Progress Dashboard:** Strictly database-backed metrics (never fabricated), streaks, quiz averages, and 7-day rollups.
- **Module K — Adaptive Learning:** Deterministic rules for low scores, consistent mastery, missed deadlines, milestone completion, and weak practical areas.
- **Module L — Offline Data Management:** Versioned SQLite migrations, model SHA-256 verification, storage management, privacy controls, and cross-platform JSON backup/restore.
