# Android ExecuTorch Inference POC (`org.pytorch:executorch-android:1.5.1`)

- **Native Kotlin Module:** `apps/mobile/modules/executorch-llama/android/src/main/java/com/ailearningcompanion/executorch/ExecuTorchLlamaModule.kt`
- **Verified ExecuTorch APIs (inspected directly from `executorch-android-1.5.1-sources.jar`):**
  - `LlmModuleConfig.create().modulePath(...).tokenizerPath(...).temperature(...).modelType(LlmModuleConfig.MODEL_TYPE_TEXT).loadMode(LlmModuleConfig.LOAD_MODE_MMAP).build()`
  - `LlmModule(config)`, `load()`, `resetContext()`, `generate(prompt, LlmGenerationConfig, LlmCallback)`, `stop()`, `close()`
- **Background Threading & Diagnostics:** Runs `.pte` loading and inference on `CoroutineScope(SupervisorJob() + Dispatchers.IO)`, validates `.pte` (>= 1024 B) & tokenizer (>= 128 B) sizes, computes `SHA-256`, and queries `ActivityManager.MemoryInfo` (`availMem`, `totalMem`, `lowMemory`) + `Build.SUPPORTED_ABIS`.
- **Dedicated POC Route:** `apps/mobile/app/inference-poc.tsx`.
- **Current Status:** Kotlin bridge, TypeScript adapter (`NativeExecuTorchProvider`), and `expo prebuild --platform android` **PASS**; APK compilation and physical device ExecuTorch execution **BLOCKED** by missing Android SDK/device (`BLK-03`) and gated `.pte` export (`BLK-02`).
