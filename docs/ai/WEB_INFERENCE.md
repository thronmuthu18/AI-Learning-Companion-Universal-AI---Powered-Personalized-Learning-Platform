# Web Llama 3.2 Inference POC (`@mlc-ai/web-llm`)

- **Runtime:** `@mlc-ai/web-llm@0.2.89` executing inside `apps/web/src/ai/webllm.worker.ts`.
- **Primary Model:** `Llama-3.2-1B-Instruct-q4f16_1-MLC` (~879 MB VRAM, WebGPU `shader-f16`).
- **Fallback Model:** `Llama-3.2-1B-Instruct-q4f32_1-MLC` (~1120 MB VRAM, when `shader-f16` is absent).
- **Dedicated POC Screen:** `InferencePocScreen` (`apps/web/src/screens/InferencePocScreen.tsx`), accessible in the sidebar as **Inference POC Lab**.
- **Diagnostics Measured:** WebGPU adapter detection, `shader-f16` support, `navigator.deviceMemory`, `navigator.storage.estimate()`, Browser Cache Storage `hasModelInCache()`, `loadTimeMs`, `prefillTimeMs`, `totalTimeMs`, `generatedTokens`, and `decodeTokensPerSec`.
- **Offline Behavior:** Initial caching requires internet access; `loadModel()` rejects offline initialization cleanly if uncached (never falls back to remote APIs). Once cached, subsequent loads and inference execute offline.
- **Current Status:** TypeScript & Vite production build **PASS** (`webllm.worker-*.js` bundled); live Chrome WebGPU inference **BLOCKED** pending Chrome remote debugging (`BLK-04`).
