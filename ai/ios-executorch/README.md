# iOS ExecuTorch Integration Spec

- **Swift Package Dependency:** `https://github.com/pytorch/executorch` (wired via [withExecuTorchNative.js](file:///m:/ai%20learning%20companion/apps/mobile/plugins/withExecuTorchNative.js))
- **Targets Required in Xcode:** `executorch`, `executorch_llm`, `backend_xnnpack`
- **Native Module:** [ExecuTorchLlamaModule.swift](file:///m:/ai%20learning%20companion/apps/mobile/modules/executorch-llama/ios/ExecuTorchLlamaModule.swift) + [ExecuTorchLlama.podspec](file:///m:/ai%20learning%20companion/apps/mobile/modules/executorch-llama/ios/ExecuTorchLlama.podspec)
- **Minimum iOS Deployment Target:** `17.0`
- **Build Requirement:** macOS + Xcode + Apple signing + physical iPhone for hardware inference (currently `BLOCKED` on Windows host — BLK-01).
