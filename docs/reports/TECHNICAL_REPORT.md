# Technical Project Report — AI Learning Companion

## 1. Executive Summary
AI Learning Companion implements an offline-first educational ecosystem across Web, Android, and iOS built around a shared TypeScript domain core, local relational/IndexedDB persistence, and genuine locally executed Meta Llama 3.2 1B Instruct inference.

## 2. Core Engineering Achievements
- **Shared Monorepo (`13` TypeScript packages + `2` applications)**: Complete separation of deterministic educational algorithms from platform UI and native AI bindings.
- **Directed Prerequisite Safety**: `@alc/skill-graph` implements 3-color DFS cycle detection and Kahn topological sorting, strictly gating advanced topics on verified assessment competence rather than self-reported confidence.
- **Realistic Study Planning**: `@alc/study-planner` distributes lessons, spaced-repetition revision, milestone assessments, and practical projects within the learner's daily minute budget and flags unrealistic deadlines automatically.
- **Local AI Providers (`@alc/ai-contracts`, `@alc/ai-adapters`)**:
  - Web: `@mlc-ai/web-llm` in a dedicated Web Worker with WebGPU hardware & `shader-f16` detection, automatic `q4f16_1`/`q4f32_1` selection, and Cache Storage offline persistence.
  - Android: Custom Kotlin Expo Module (`ExecuTorchLlamaModule.kt`) integrating `org.pytorch:executorch-android:1.5.1` (`LlmModule`, `LlmModuleConfig`, `LlmGenerationConfig`, `LlmCallback`) and SHA-256 verification.
  - iOS: Custom Swift Expo Module (`ExecuTorchLlamaModule.swift`) integrating `ExecuTorchLLM` (`TextLLMRunner`) via Swift Package Manager and Expo Config Plugin (`withExecuTorchNative.js`).
- **Cross-Platform Data Portability**: Versioned JSON `BackupEnvelope` with file-size limits, Zod schema validation, and SHA-256 integrity checks.

## 3. Known Limitations & Future Enhancements
1. **macOS / Xcode Environment Required for iOS Build**: Compiling `.ipa` and executing physical iPhone ExecuTorch inference requires macOS/Xcode and Apple signing credentials (logged in `BLOCKERS.md` BLK-01).
2. **Android SDK Compilation & Physical Device Benchmarking**: Building the `.apk` requires Android SDK platform/build tools and license acceptance; physical ARM64 latency/memory benchmarks require an attached Android device.
3. **Gated Meta Llama Weights for `.pte` Export**: Exporting `.pte` weights via `ai/conversion/export_llama_executorch.py` requires the user's `HF_TOKEN` after accepting Meta's Llama 3.2 Community License on Hugging Face.
4. **Future Enhancements**: Optional encrypted peer-to-peer LAN sync between Web and Mobile, additional domain question banks, and GPU/NPU delegate selection (Qualcomm QNN / Vulkan / CoreML) once device targets are verified.
