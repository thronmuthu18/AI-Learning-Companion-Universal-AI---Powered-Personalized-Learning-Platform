# TECH STACK DECISIONS — AI Learning Companion

## 1. Monorepo Structure (`npm workspaces`)
- **Choice:** `apps/web`, `apps/mobile`, and `13` shared `packages/*` managed with npm workspaces + TypeScript `5.8.3` + Vitest `3.2.7`.
- **Evidence:** All 15 workspaces share domain entities, Zod schemas, deterministic learning/planning/adaptive engines, design tokens, and repository/AI contracts without circular dependencies (`npm run typecheck` passes 15/15).

## 2. Web Presentation Layer (`apps/web`: Vite 6 + React 19 vs Metro `react-native-web`)
- **Choice:** Dedicated React 19 + Vite 6 PWA (`apps/web`) consuming all shared `@alc/*` packages directly, alongside Expo Router (`apps/mobile`) for Android & iOS.
- **Rationale:** `@mlc-ai/web-llm` relies on ES-module Web Workers (`new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' })`), WebGPU `.wasm` assets, and browser Cache Storage. Vite bundles this worker architecture cleanly (`dist/assets/webllm.worker-*.js`), whereas Metro's web bundler frequently conflicts with `import.meta.url` worker bundling and `node:` polyfills. Meanwhile, 100% of business logic, data contracts, storage schemas, and AI prompts remain shared in `packages/*`.

## 3. Mobile Framework (`Expo SDK 55` + `Expo Router` + Custom Native Modules)
- **Choice:** Expo SDK `55.0.32` (`react-native@0.83.10`, `react@19.2.0`) with **Expo Prebuild (CNG)** and custom local Expo Module `apps/mobile/modules/executorch-llama`.
- **Rationale:** Expo Go cannot load custom C++/JNI native runtimes such as ExecuTorch. Expo Modules API (`ExpoModulesCore`) provides typed JSI/TurboModule bindings for Kotlin (Android) and Swift (iOS) while integrating seamlessly with `expo prebuild` and `expo-sqlite`.
- **Validation Note:** Ran `npx expo-doctor@latest` and resolved 4 configuration issues (`newArchEnabled` removed from `app.json` per SDK 55 schema, direct `expo-modules-core` removed from `apps/mobile/package.json`, `metro.config.js` preserves Expo default `watchFolders`, and `react` pinned to `19.2.0` across both apps to eliminate duplicate React copies).

## 4. Local AI Runtimes
- **Android:** `org.pytorch:executorch-android:1.5.1` (verified against Maven Central `maven-metadata.xml` and extracted `LlmModule.kt`, `LlmModuleConfig.kt`, `LlmGenerationConfig.kt`, `LlmCallback.kt` from `-sources.jar`). Uses `LOAD_MODE_MMAP` + XNNPACK CPU backend.
- **iOS:** Official ExecuTorch Swift Package (`https://github.com/pytorch/executorch`, `executorch` / `executorch_llm` / `backend_xnnpack`) wrapped in `ExecuTorchLlamaModule.swift` and wired via `withExecuTorchNative.js` config plugin.
- **Web:** `@mlc-ai/web-llm@0.2.89` running in a dedicated Web Worker with WebGPU hardware & `shader-f16` detection.

## 5. Persistence & Validation
- **Web Storage:** IndexedDB via `idb@^8.0.3`.
- **Mobile Storage:** SQLite via `expo-sqlite` with `PRAGMA foreign_keys = ON` and versioned `SQLITE_MIGRATIONS`.
- **Validation & Security:** `zod@^4.6.7` (upgraded from `3.x` to remediate `GHSA-mrhx-c7xc-m3w5`) and pure-TS + WebCrypto SHA-256 checksums for backups and `.pte` model integrity.
