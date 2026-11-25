# iOS ExecuTorch Inference POC (`ExecuTorchLLM` SPM)

- **Native Swift Module:** `apps/mobile/modules/executorch-llama/ios/ExecuTorchLlamaModule.swift`
- **Podspec & Config Plugin:** `ExecuTorchLlama.podspec` + `apps/mobile/plugins/withExecuTorchNative.js` (wires `XCRemoteSwiftPackageReference` `https://github.com/pytorch/executorch` >= `1.5.0` and attaches `executorch`, `executorch_llm`, `backend_xnnpack` `XCSwiftPackageProductDependency` entries to the app target).
- **Runtime APIs:** `TextLLMRunner(modelPath:tokenizerPath:specialTokens:)`, `runner.generate(...)`, `runner.stop()`, `runner.reset()`, `CryptoKit.SHA256`, `os_proc_available_memory()`, and `ProcessInfo.processInfo.physicalMemory`.
- **Reproducible macOS Build & Test Steps:**
  ```bash
  cd apps/mobile
  npx expo prebuild --platform ios --clean
  cd ios && pod install
  open AILearningCompanion.xcworkspace
  # Build & run on a physical iPhone (iOS 17+) with developer signing;
  # export llama-3.2-1b-instruct.pte + tokenizer.model and load via Settings -> ExecuTorch Inference POC.
  ```
- **Current Status:** **BLOCKED** on Windows 11 host (macOS, Xcode, CocoaPods, Apple signing, and physical iPhone unavailable — `BLK-01`).
