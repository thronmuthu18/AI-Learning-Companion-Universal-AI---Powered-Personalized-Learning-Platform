# Local Llama 3.2 AI Deployment Guide

## 1. Model Selection & Rationale
- **Primary Model**: **Meta Llama 3.2 1B Instruct** (4-bit quantized).
- **Why 1B 4-bit**: Fits within 2 GB+ consumer mobile RAM budgets (~780 MB `.pte` on ExecuTorch; ~879 MB VRAM on WebLLM `q4f16_1`), supports streaming decode, and executes offline on CPU (XNNPACK) and WebGPU.
- **License**: Meta Llama 3.2 Community License. Requires explicit user acceptance on Hugging Face (`meta-llama/Llama-3.2-1B-Instruct`) before exporting raw weights, plus `"Built with Llama"` attribution (`NOTICE`).

## 2. Platform Runtime Matrix

| Platform | Runtime | Artifact Format | Hardware Backend | Model ID / Package |
|---|---|---|---|---|
| Web PWA | `@mlc-ai/web-llm@0.2.89` | MLC weights + `.wasm` | WebGPU (`shader-f16`, fallback `q4f32_1`) | `Llama-3.2-1B-Instruct-q4f16_1-MLC` |
| Android | `org.pytorch:executorch-android:1.5.1` | `.pte` + `tokenizer.model` | XNNPACK CPU (`arm64-v8a`, `x86_64`) | `ExecuTorchLlamaModule.kt` |
| iOS | `https://github.com/pytorch/executorch` SPM | `.pte` + `tokenizer.model` | XNNPACK / CoreML | `ExecuTorchLlamaModule.swift` |

> **Important Format Separation**: ExecuTorch `.pte` binaries cannot be loaded by `@mlc-ai/web-llm`, and MLC WebGPU weights cannot be loaded by ExecuTorch native runners. Each platform uses its official compatible artifact.

## 3. Reproducible Mobile `.pte` Export Pipeline
```bash
# 1. Accept Meta Llama 3.2 Community License on Hugging Face and set token:
export HF_TOKEN=<your_huggingface_token>

# 2. Export quantized XNNPACK ExecuTorch .pte + tokenizer + SHA-256 manifest:
python ai/conversion/export_llama_executorch.py --output-dir ai/exports/llama-3.2-1b

# 3. Verify integrity before copying to Android/iOS device storage:
python ai/scripts/verify_model_integrity.py ai/exports/llama-3.2-1b
```

## 4. Prompting & Output Validation
- Mobile native modules receive prompts formatted using `formatLlama32InstructPrompt()` (`<|begin_of_text|><|start_header_id|>...`).
- Structured responses (goal interpretation, skill-gap summary, roadmap advisory) are parsed by `extractAndValidateJson()` and verified against Zod schemas in `@alc/validation`.
- When a model is not loaded or hardware lacks WebGPU, providers return explicit error states and never fall back to remote APIs or simulated responses.
