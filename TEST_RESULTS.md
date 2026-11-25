# TEST RESULTS — AI Learning Companion

Status legend: `PASS` | `FAIL` | `BLOCKED` | `NOT TESTED`

## 1. Automated Unit & Integration Tests
| Suite | Status | Command | Details |
|---|---|---|---|
| Architecture Boundaries (`tests/architecture-boundaries.test.ts`) | PASS | `npm test` | 4/4 passed (acyclic 13-pkg DAG, zero remote LLM SDKs, WebLLM isolation, 28 `AppScreenId` routes wired) |
| Skill Graph (`tests/skill-graph.test.ts`) | PASS | `npm test` | 3/3 passed (topological sort, cycle detection, assessment-gated readiness) |
| AI Adapters & Security (`tests/ai-adapters-and-security.test.ts`) | PASS | `npm test` | 3/3 passed (Llama 3.2 chat template, mocked native bridge + Zod, URL/size/input sanitization) |
| Engine Integration (`tests/integration-engines.test.ts`) | PASS | `npm test` | 2/2 passed (assessment, skill gap, roadmap, study planner, adaptive rules, SHA-256 JSON backup/tamper detection) |
| Inference POC (`tests/inference-poc.test.ts`) | PASS | `npm test` | 4/4 passed (`initialize`/`loadModel`/`generateStream`/`getDiagnostics`/`unloadModel`, invalid `.pte`, `cancel()`, iOS unlinked SPM diagnostics, WebLLM offline & missing-WebGPU rejection) |
| Shared Foundation (`tests/shared-foundation.test.ts`) | PASS | `npm test` | 4/4 passed (all 13 package exports + >=16 goal templates, SQLite migration monotonicity/FKs, strict `BackupEnvelopeSchema`, prototype-pollution rejection, log redaction) |
| Storage Architecture (`tests/storage-architecture.test.ts`) | PASS | `npm test` | 3/3 passed (real `IndexedDBLearningRepository` CRUD/indexes/restart + real `node:sqlite` v1->v2 migration/FK/rollback + cross-platform SHA-256 backup/restore parity) |
| Learning Engines E2E (`tests/learning-engines-e2e.test.ts`) | PASS | `npm test` | 2/2 passed (Full Stack beginner 2h/day weak-JS E2E across all 6 engines + hierarchy queries, malformed inputs, inverted deadlines, difficulty bump) |
| Universal All-Domain Engine (`tests/universal-domain-engine.test.ts`) | PASS | `npm test` | 3/3 passed (GATE ECE, Python, Business Accounting, Physics, Competitive Exams via generic engines; runtime `DomainRegistry` extension; honest 30-domain `getDomainContentCoverage` & empty-target validation) |
| Learner Onboarding & Profile (`tests/learner-onboarding-profile.test.ts`) | PASS | `npm test` | 3/3 passed (multi-domain onboarding validation, unassessed skill seeding preserving verified skills, field-level change diff history, IndexedDB reload persistence + backup validation via `fake-indexeddb`) |
| Universal Goal Management (`tests/goal-identification-management.test.ts`) | PASS | `npm test` | 4/4 passed (deterministic interpretation across 6 domains, mocked Llama `llm_local` vs `deterministic_fallback`, invalid-date/duplicate/unknown-skill/unrealistic-deadline validation, multi-goal capacity cap & IndexedDB edit/archive/delete) |
| Skill-Gap & Prerequisite Engine (`tests/skill-gap-prerequisite-engine.test.ts`) | PASS | `npm test` | 3/3 passed (transitive multi-hop Physics/GATE ECE/Business Accounting gating, unlock impact, confidence vs assessment separation, cycle/dangling detection, runtime Medical domain) |
| Learning Roadmap Generator (`tests/learning-roadmap-generator.test.ts`) | PASS | `npm test` | 4/4 passed (5 domains w/ explanations & zero forced CS, multi-goal capacity cap & daily/weekly/missed rescheduling, progress preservation + IndexedDB backup parity, invalid/empty profile clamping) |
| Universal Assessment Engine (`tests/universal-assessment-engine.test.ts`) | PASS | `npm test` | 3/3 passed (GATE ECE, Python, Accounting, Physics, Competitive Exams, Graphic Design scenarios; numerical tolerance/unit checks, manual/`pending_review` rubrics without fake AI scores, adaptive selection, IndexedDB attempt comparison history) |
| Intelligent Study Planner (`tests/intelligent-study-planner.test.ts`) | PASS | `npm test` | 6/6 passed (6 domains w/ daily/weekly caps, preferred days/blackouts & zero overlaps; multi-goal priority capacity sharing; 6-state lifecycle & partial continuation splitting; adaptive reschedule preview & completed preservation; invalid availability safety; IndexedDB + SHA-256 backup parity) |
| Progress Tracking & Adaptive Learning (`tests/progress-adaptive-engine.test.ts`) | PASS | `npm test` | 5/5 passed (6-domain skill/topic/domain/goal aggregation; study-time vs demonstrated mastery isolation; consistency, time accuracy & trend calculation; evidence-backed adaptive triggers & retention estimates; confirmation-first plan previews; empty/invalid state & IndexedDB backup parity) |

## 2. Build Verification
| Target | Status | Command | Details |
|---|---|---|---|
| Monorepo Lint (`13` packages + host scan) | PASS | `npm run lint` | 0 violations across manifests, tsconfig inheritance, and remote LLM host scan |
| Monorepo TypeScript (`15` workspaces) | PASS | `npm run typecheck` | 0 TypeScript errors across all 13 `packages/*`, `@alc/mobile`, and `@alc/web` |
| Clean Lockfile Check | PASS | `npm ci --dry-run` | Exit code 0 verifying lockfile consistency |
| Web PWA Production Build | PASS | `npm run web:build` | Built `apps/web/dist/index.html`, `webllm.worker-BNYmPRvQ.js` (`6,143.63 kB`), `index-Dr4u7804.js` (`6,790.80 kB`), CSS (`4.16 kB`) in `17.86s` |
| Expo Android Prebuild | PASS | `npx expo prebuild --platform android --no-install` | Generated/synced `apps/mobile/android/` cleanly with `ExecuTorchLlamaModule.kt` (`1.5.1`) |
| Expo Doctor (`apps/mobile`) | 19/20 PASS | `npx expo-doctor@latest` | React `19.2.0` deduplicated; 1 expected CNG sync notice for retained `android/` folder |
| Python Export & Checksum CLI | PASS (Syntax/CLI) | `python -m py_compile` & `--help` | Compilation and CLI help pass; gated export requires `HF_TOKEN` (BLK-02) |
| Android Gradle APK (`assembleDebug`) | BLOCKED | — | Android SDK not installed (`ANDROID_HOME` unset — BLK-03) |
| iOS Xcode Archive (`.xcworkspace` / `.ipa`) | BLOCKED | — | Windows 11 host lacks macOS & Xcode (BLK-01) |

## 3. Actual Model Inference
| Platform | Status | Details |
|---|---|---|
| Web (`@mlc-ai/web-llm` WebGPU) | BLOCKED | Chrome remote debugging not enabled (`DevToolsActivePort` missing — BLK-04) |
| Android (`ExecuTorch` `.pte`) | BLOCKED | Requires Android SDK/device (BLK-03) and gated `.pte` export (`HF_TOKEN` — BLK-02) |
| iOS (`ExecuTorchLLM` `.pte`) | BLOCKED | Requires macOS/Xcode/physical iPhone (BLK-01) and gated `.pte` export (BLK-02) |

## 4. Physical Device Verification
| Device | Status | Details |
|---|---|---|
| Physical Android Phone | NOT TESTED / BLOCKED | No device connected via USB/ADB (BLK-03) |
| Physical iPhone | BLOCKED | Windows host; no physical iPhone / Apple signing / Xcode (BLK-01) |

## 5. Performance Benchmarks
| Metric | Status | Measured Value |
|---|---|---|
| Model Load Time (`loadTimeMs`) | NOT MEASURED | Pending real WebGPU/device inference (never fabricated) |
| Prefill & First-Token Latency | NOT MEASURED | Pending real WebGPU/device inference |
| Decode Throughput (`tokens/sec`) | NOT MEASURED | Pending real WebGPU/device inference |
| Peak Device RAM / VRAM | NOT MEASURED | Pending real WebGPU/device inference |
