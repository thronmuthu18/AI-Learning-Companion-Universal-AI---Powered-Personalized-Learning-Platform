# PLATFORM COMPATIBILITY MATRIX — AI Learning Companion

> **Integrity Rule:** Every capability below strictly separates **Verified in Current Environment** from **Documented / Theoretical Support** and **Blocked**.

## 1. Host Development Environment (Measured 2026-11-25)

| Component | Measured Value / Status | Suitability |
|---|---|---|
| Operating System | Windows 11 Home Single Language (x64, Build 26300) | Supports Web, Node/Vitest, Python, and Android Gradle builds (once SDK installed); **cannot run Xcode/iOS builds**. |
| System Memory (RAM) | 15.71 GB total (~6–9 GB free during dev) | Sufficient for Vite, TypeScript, Gradle, and WebGPU inference on host AMD Radeon Graphics. |
| Disk Space | `C:\`: 39.51 GB free / `M:\`: 103.04 GB free | Sufficient for Android SDK (~2–4 GB) and model export weights (~3–5 GB). |
| Node.js / npm | Node `v22.17.0`, npm `10.9.2` | Meets Expo SDK 55 & Vite 6 requirements (`>= 20.0.0`). |
| Python | Python `3.10.0` (PyTorch `2.10.0`, Transformers `5.15.1`) | Suitable for ExecuTorch export CLI scripts (requires installing `optimum-executorch` + `HF_TOKEN`). |
| Java JDK | JDK `21.0.11` (`C:\Program Files\Java\jdk-21.0.11`) | Matches React Native / Android Gradle plugin Java 17–21 requirement. |
| Android SDK / ADB | **Not Installed** (`ANDROID_HOME` unset) | Blocks local APK compilation (`./gradlew assembleDebug`) until SDK installed with license approval. |
| macOS / Xcode / iOS | **Unavailable** | Blocks iOS compilation, CocoaPods/SPM resolution, Simulator, and physical iPhone inference. |

---

## 2. Platform Runtime & Feature Matrix

| Capability | Web (PWA) | Android | iOS |
|---|---|---|---|
| **UI Framework** | React 19 + Vite + TypeScript (`apps/web`) | Expo SDK 55 + Expo Router + React Native `0.83.10` | Expo SDK 55 + Expo Router + React Native `0.83.10` |
| **TypeScript Compile** | **PASS** (`tsc --noEmit` + `vite build`) | **PASS** (`tsc --noEmit`) | **PASS** (`tsc --noEmit`) |
| **Local Database** | IndexedDB (`idb`) — Implemented (`[NOT TESTED]` live browser due to BLK-04) | SQLite (`expo-sqlite` + migrations) — Implemented (`[BLOCKED]` runtime by BLK-03) | SQLite (`expo-sqlite` + migrations) — Implemented (`[BLOCKED]` runtime by BLK-01) |
| **Local Llama Runtime** | `@mlc-ai/web-llm@0.2.89` WebGPU Worker | `org.pytorch:executorch-android:1.5.1` (`LlmModule` + XNNPACK) | `ExecuTorchLLM` SPM (`TextLLMRunner` + XNNPACK) |
| **Native Bridge** | Web Worker (`WebWorkerMLCEngine`) | `ExecuTorchLlamaModule.kt` (`ExpoModulesCore`) | `ExecuTorchLlamaModule.swift` (`ExpoModulesCore`) |
| **Model Artifact Format** | MLC WebGPU weights + `.wasm` | ExecuTorch `.pte` + `tokenizer.model` | ExecuTorch `.pte` + `tokenizer.model` |
| **Offline App Shell** | Service Worker (`public/sw.js`) + `manifest.webmanifest` | Native APK bundle + local SQLite + local `.pte` | Native IPA bundle + local SQLite + local `.pte` |
| **Verification Status** | Build **PASS**; Live Chrome/WebGPU **BLOCKED** (BLK-04) | `expo prebuild` **PASS**; Gradle APK & device inference **BLOCKED** (BLK-03, BLK-02) | **BLOCKED** (macOS/Xcode/iPhone unavailable — BLK-01) |
