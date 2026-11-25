# NATIVE BRIDGE & OFFLINE-FIRST DESIGN — AI Learning Companion

## 1. Android ExecuTorch Bridge (`ExecuTorchLlamaModule.kt`)
- **Runtime Artifact:** `org.pytorch:executorch-android:1.5.1` (`arm64-v8a`, `x86_64`).
- **Threading & Lifecycle:**
  - Dedicated `CoroutineScope(SupervisorJob() + Dispatchers.IO)` prevents UI thread stalls during `.pte` memory-mapping (`LlmModuleConfig.LOAD_MODE_MMAP`) and token decoding.
  - `OnDestroy` closes `llmModule` (`close()`) and cancels `workerScope` cleanly to prevent native JNI leaks.
  - AndroidManifest sets `android:largeHeap="true"` via `withExecuTorchNative.js`.
- **Token Streaming & Stats:**
  - `LlmCallback.onResult(token)` emits Expo `onToken` events in real time.
  - `LlmCallback.onStats(stats)` forwards ExecuTorch JSON telemetry (`tokens_per_sec`, `num_generated_tokens`).
  - `resetContext()` clears KV cache before each independent request so prior prompts do not bleed across tasks.
- **Integrity Gate:** `verifyFileSha256(filePath)` streams 1 MB chunks through `MessageDigest.getInstance("SHA-256")` before loading user-imported `.pte` or `tokenizer.model` binaries.

## 2. iOS ExecuTorch Bridge (`ExecuTorchLlamaModule.swift`)
- **Runtime Artifact:** Official ExecuTorch SPM (`https://github.com/pytorch/executorch`, targets `executorch`, `executorch_llm`, `backend_xnnpack`) wired via `withExecuTorchNative.js` config plugin.
- **Threading & Lifecycle:**
  - Serial `DispatchQueue(label: "com.ailearningcompanion.executorch.ios", qos: .userInitiated)` isolates `TextLLMRunner` operations.
  - `CryptoKit.SHA256` streams 1 MB chunks under `autoreleasepool` to verify `.pte` & `tokenizer.model` checksums without spiking memory.
  - Conditional `#if canImport(ExecuTorchLLM)` guard surfaces `ERR_EXECUTORCH_NOT_LINKED` explicitly if compiled without SPM linkage—never faking inference.

## 3. Web WebGPU Worker (`WebWebLLMProvider`)
- **Worker Isolation:** `apps/web/src/ai/webllm.worker.ts` runs `WebWorkerMLCEngineHandler` off the main UI thread.
- **Capability Detection:** `detectWebGPUCapabilities()` inspects `navigator.gpu.requestAdapter()` and `adapter.features.has('shader-f16')`, routing to `Llama-3.2-1B-Instruct-q4f16_1-MLC` or `Llama-3.2-1B-Instruct-q4f32_1-MLC`.
- **Offline Boundary:**
  - App shell, stylesheets, bundled JS, and worker assets are cached by `apps/web/public/sw.js`.
  - Model weights are cached in Browser Cache Storage by `@mlc-ai/web-llm`; `hasModelInCache()` gates offline initialization so offline users with uncached weights receive a clear offline notice rather than a silent network failure.
