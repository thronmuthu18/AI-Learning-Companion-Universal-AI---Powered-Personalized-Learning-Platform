# ARCHITECTURAL & TECHNICAL DECISIONS — AI Learning Companion

## DEC-001: Primary Local LLM Selection
- **Decision:** Meta **Llama 3.2 1B Instruct** (4-bit quantized) as primary candidate, with optional 3B support in model registry.
- **Rationale:** Fits comfortably inside mobile RAM limits (4-bit ExecuTorch ~0.75–1.1 GB RAM footprint; WebLLM `Llama-3.2-1B-Instruct-q4f16_1-MLC` requires ~879 MB VRAM), fast prefill/decode on mobile CPUs (XNNPACK) and consumer GPUs (WebGPU), 4K–128K context capability (4096 default context window in WebLLM/mobile configs for predictable RAM).
- **License:** Meta Llama 3.2 Community License (requires `Notice` attribution, `LICENSE`, and "Built with Llama" UI/docs disclosure).

## DEC-002: Monorepo & Shared Codebase Strategy
- **Decision:** npm workspaces monorepo with:
  - `apps/web`: Dedicated React 19 + TypeScript + Vite + PWA + `@mlc-ai/web-llm` + IndexedDB application (using shared workspace packages directly).
  - `apps/mobile`: Expo SDK (New Architecture, Expo Router, `expo-sqlite`, custom native Expo Modules in Kotlin for Android and Swift for iOS).
  - `packages/*`: Shared TypeScript packages (`shared-types`, `design-system`, `skill-graph`, `assessment-engine`, `study-planner`, `progress-engine`, `adaptive-engine`, `learning-engine`, `ai-contracts`, `ai-adapters`, `validation`, `storage`, `resource-management`).
- **Rationale:** Matches Section 3 & 11 cleanly. Keeps Web PWA build fast, modern, and deeply integrated with WebGPU/WebLLM/Service Workers without forcing Metro Web bundling conflicts with `@mlc-ai/web-llm` WASM/WebWorker internals, while sharing 100% of domain logic, types, design tokens, prompts, validation schemas, and repository interfaces across Web, Android, and iOS.

## DEC-003: Native ExecuTorch Integration (Android & iOS)
- **Decision:** Custom local Expo Module `packages/executorch-llama` (`modules/executorch-llama` inside `apps/mobile` or workspace module) implementing:
  - Android: Kotlin module wrapping `org.pytorch:executorch-android:1.5.1` (`LlmModule`, `LlmModuleConfig`, `LlmGenerationConfig`, `LlmCallback`) with XNNPACK CPU backend, streaming token events, cancellation (`stop()`), SHA-256 verification, and lifecycle cleanup.
  - iOS: Swift module wrapping `ExecuTorch` / `ExecuTorchLLM` (`TextLLMRunner`) via Swift Package Manager (`https://github.com/pytorch/executorch`), plus Expo config plugin to wire SPM package dependency into Xcode project during `expo prebuild`.

## DEC-004: Web Inference & Offline Storage
- **Decision:** `@mlc-ai/web-llm` (`0.2.89`) running in a dedicated Web Worker (`WebWorkerMLCEngine`) with `Llama-3.2-1B-Instruct-q4f16_1-MLC` (and `q4f32_1` fallback if `shader-f16` unsupported), IndexedDB (`idb`) for structured relational persistence + WebLLM Cache Storage for offline model weights, and Vite PWA (`vite-plugin-pwa` / Workbox) for full offline app shell & bundled educational assets.

## DEC-005: Deterministic Intelligence + Local AI Advisory Separation
- **Decision:** All competency scoring, directed prerequisite graph validation (cycle detection, topological ordering), skill-gap categorization, study schedule hour allocation, and adaptive rule triggers run deterministically in pure TypeScript engines. Local Llama inference augments with structured JSON (validated via Zod) for goal interpretation, personalized explanations, study advice, tutoring Q&A, and project ideas—never fabricating metrics or overriding prerequisite safety.
