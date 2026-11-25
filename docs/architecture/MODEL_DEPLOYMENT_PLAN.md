# MODEL DEPLOYMENT PLAN — Meta Llama 3.2

## 1. Candidate Evaluation (1B vs 3B Instruct)

| Criterion | Llama 3.2 1B Instruct (Primary) | Llama 3.2 3B Instruct (Optional High-RAM) |
|---|---|---|
| Parameter Count | ~1.23B parameters | ~3.21B parameters |
| License | Meta Llama 3.2 Community License (700M MAU cap; `"Built with Llama"` + `Notice` required) | Same |
| Hugging Face Gating | Gated (`meta-llama/Llama-3.2-1B-Instruct`) for raw PyTorch/ExecuTorch weights; public pre-quantized MLC weights for WebLLM (`mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC`) | Same gating for raw weights; `Llama-3.2-3B-Instruct-q4f16_1-MLC` public on HF |
| Quantization Options | ExecuTorch: `8da4w` / SpinQuant / 4-bit groupwise XNNPACK; WebLLM: `q4f16_1` (primary) & `q4f32_1` (fallback) | Same |
| Storage Footprint | ~0.78–1.1 GB `.pte` (mobile); ~879 MB `q4f16_1` / ~1.12 GB `q4f32_1` (WebGPU) | ~2.0–2.3 GB |
| Peak RAM / VRAM | ~1.0–2.0 GB RAM on mobile; ~879 MB VRAM on WebGPU | ~2.3–4.0 GB RAM/VRAM |
| Context Window | 128K native; capped at 2048 (mobile) / 4096 (Web) for predictable memory | Same |
| Expected Speed (Documented Benchmarks) | ExecuTorch XNNPACK: ~6–25+ tok/s mid-tier, up to ~45–50 tok/s on flagship ARMv9 CPUs (SpinQuant/KleidiAI); ~260–350+ tok/s prefill | ~2–3x slower decode than 1B on mobile CPU |

**Decision:** Select **Llama 3.2 1B Instruct** (4-bit quantized) as the primary default across Web, Android, and iOS so consumer laptops and mid-range phones remain within safe memory limits.

---

## 2. English & Tamil Language Quality Assessment

| Language | Official Meta Support | Expected Behavior & Limitations | Evidence Status |
|---|---|---|---|
| **English** | Officially supported (1 of 8 core languages) | Strong instruction-following, reliable structured JSON generation when temperature is low (`0.2–0.4`), and consistent educational explanations. | Documented by Meta; structured JSON parser verified in Vitest (`tests/integration-engines.test.ts`); live WebGPU/device inference pending runtime unblocking. |
| **Tamil** | **Not officially supported** (Meta Llama 3.2 1B/3B officially target EN, DE, FR, IT, PT, ES, HI, TH) | Pretraining includes minor Indic web text, so stock 1B exhibits high subword token fertility (more tokens per Tamil word), slower throughput, shorter effective context, and frequent English code-switching or brittle reasoning in pure Tamil. | Literature & official model card evidence only (`NOT TESTED` on device). Recommended mitigation: keep structured JSON control fields in English and evaluate a Tamil-adapted fine-tune (e.g., continual pre-training on Tamil educational corpora) in a future phase if pure Tamil tutoring is required. |

---

## 3. Platform-Specific Artifact Pipelines

### A. Android & iOS (PyTorch ExecuTorch `.pte` + `tokenizer.model`)
1. Accept Meta Llama 3.2 Community License on Hugging Face and export `HF_TOKEN`.
2. Export quantized XNNPACK `.pte` + SHA-256 manifest via `ai/conversion/export_llama_executorch.py` (`optimum-cli export executorch --recipe xnnpack --use_custom_sdpa --use_custom_kv_cache`).
3. Verify checksums via `ai/scripts/verify_model_integrity.py` and in-app native `verifyFileSha256()` before calling `LlmModule.load()` (Android) or `TextLLMRunner` (iOS).

### B. Web PWA (`@mlc-ai/web-llm@0.2.89`)
1. Detect WebGPU (`navigator.gpu`) and `shader-f16` via `detectWebGPUCapabilities()`.
2. Load `Llama-3.2-1B-Instruct-q4f16_1-MLC` (or `Llama-3.2-1B-Instruct-q4f32_1-MLC` if `shader-f16` unsupported) inside `webllm.worker.ts`.
3. Cache weights in browser Cache Storage via WebLLM; once cached, `hasModelInCache()` allows subsequent inference with network disconnected.
