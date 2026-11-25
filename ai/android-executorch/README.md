# Android ExecuTorch Integration Spec

- **Maven Artifact:** `org.pytorch:executorch-android:1.5.1`
- **Native Module:** [ExecuTorchLlamaModule.kt](file:///m:/ai%20learning%20companion/apps/mobile/modules/executorch-llama/android/src/main/java/com/ailearningcompanion/executorch/ExecuTorchLlamaModule.kt)
- **Gradle Module:** [build.gradle](file:///m:/ai%20learning%20companion/apps/mobile/modules/executorch-llama/android/build.gradle)
- **Backend:** XNNPACK CPU (`arm64-v8a`, `x86_64`), `LlmModuleConfig.LOAD_MODE_MMAP`, `LlmModuleConfig.MODEL_TYPE_TEXT`
- **Model Files:** User-exported `llama-3.2-1b-instruct.pte` + `tokenizer.model` verified by `verifyFileSha256()` before loading.
