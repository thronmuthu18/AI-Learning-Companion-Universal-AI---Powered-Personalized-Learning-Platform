# Local Llama Inference Proof of Concept (Phase 04)

## 1. Shared Platform-Independent Contract (`@alc/ai-contracts`)
`LocalAIProvider` defines a unified interface implemented separately for Web (`WebWebLLMProvider`) and Mobile (`NativeExecuTorchProvider` driving Kotlin/Swift Expo Modules):
- `initialize(config?, onProgress?)`
- `loadModel(config, onProgress?)`
- `getCapabilities()`
- `getDiagnostics()`
- `generate(request)`
- `generateStream(request, onToken)`
- `cancel()`
- `unloadModel()` / `dispose()`
- `getModelStatus()`

## 2. Verification Separation
1. **Automated Unit Tests (`npm test`):** Verified `NativeExecuTorchProvider` lifecycle, `loadTimeMs` & `decodeTokensPerSec` parsing, invalid/corrupt model rejection, `cancel()`, iOS unlinked-SPM diagnostics, and WebLLM offline/WebGPU-unavailable rejection (`tests/inference-poc.test.ts`).
2. **Build Verification:** Verified `npm run typecheck` (15/15 workspaces) and `npm run web:build` (`apps/web/dist/`).
3. **Actual Model Inference:** Pending environment unblockers (BLK-02 `.pte` gated weights, BLK-03 Android SDK/device, BLK-04 Chrome remote debugging).
4. **Physical Device Verification:** Android & iOS physical hardware inference have **NOT** been executed on this Windows 11 host.
5. **Performance Benchmarks:** Never fabricated; fields remain `null` / `"Not measured"` until executed on real hardware.

## 3. Reproducible Verification Commands
```bash
npm run typecheck
npm test
npm run web:build
```
