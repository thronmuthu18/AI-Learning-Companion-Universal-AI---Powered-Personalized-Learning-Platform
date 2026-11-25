# WebLLM Browser Inference Spec

- **Package:** `@mlc-ai/web-llm@0.2.89`
- **Worker:** [webllm.worker.ts](file:///m:/ai%20learning%20companion/apps/web/src/ai/webllm.worker.ts) (`WebWorkerMLCEngineHandler`)
- **Provider:** [web-webllm-provider.ts](file:///m:/ai%20learning%20companion/apps/web/src/ai/web-webllm-provider.ts)
- **Primary Model:** `Llama-3.2-1B-Instruct-q4f16_1-MLC` (~879 MB VRAM, requires WebGPU `shader-f16`)
- **Fallback Model:** `Llama-3.2-1B-Instruct-q4f32_1-MLC` (~1.12 GB VRAM, when `shader-f16` unavailable)
- **Offline Storage:** Model weights cached by WebLLM in Browser Cache Storage (`hasModelInCache`); App Shell cached by [sw.js](file:///m:/ai%20learning%20companion/apps/web/public/sw.js).
