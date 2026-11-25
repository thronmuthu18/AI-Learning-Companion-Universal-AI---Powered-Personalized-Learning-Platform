# Device & Model Compatibility Diagnostics Reference

| Platform | Target Model | Minimum RAM / VRAM | Required Storage | CPU / GPU Backend | Status on Current Host |
|---|---|---|---|---|---|
| Web (Chrome/Edge 113+) | `Llama-3.2-1B-Instruct-q4f16_1-MLC` (fallback `q4f32_1`) | >= 2 GB RAM / ~879 MB VRAM | ~879–1120 MB Browser Cache | WebGPU (`shader-f16` / `f32`) | Build **PASS**; Live Chrome WebGPU **BLOCKED** (`BLK-04`) |
| Android (API 24+, `arm64-v8a`) | `meta-llama/Llama-3.2-1B-Instruct` (`8da4w` `.pte`) | >= 4 GB Device RAM (~1–2 GB free) | ~780–1100 MB `.pte` + tokenizer | XNNPACK CPU (`LOAD_MODE_MMAP`) | Prebuild & TS **PASS**; APK & Device **BLOCKED** (`BLK-02`, `BLK-03`) |
| iOS (iOS 17.0+, physical iPhone) | `meta-llama/Llama-3.2-1B-Instruct` (`8da4w` `.pte`) | >= 4 GB Device RAM (~1.5 GB free) | ~780–1100 MB `.pte` + tokenizer | XNNPACK CPU (`TextLLMRunner`) | **BLOCKED** (`BLK-01`, `BLK-02`) |
