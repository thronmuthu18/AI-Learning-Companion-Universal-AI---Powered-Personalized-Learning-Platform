# Security & Privacy Policy Documentation

## Privacy Policy (Local-First Architecture)
AI Learning Companion processes all learner profiles, educational history, assessment results, quiz attempts, study schedules, and AI tutor conversations **exclusively on the user's device**.

- **Zero Remote LLM Transmission**: Prompts and learner context are never sent to OpenAI, Gemini, Claude, Groq, Hugging Face Inference APIs, or any custom cloud LLM server.
- **Zero Analytics / Tracking**: No third-party telemetry, crash reporters, or behavioral tracking SDKs are bundled.
- **Explicit Network Usage Separation**: Network access is only used optionally during:
  1. Initial WebLLM model caching in browser Cache Storage (or manual `.pte` download by the user).
  2. Opening user-initiated `optional_external` documentation links (validated as `https://` URLs).

## Implemented Security Controls
1. **Input Sanitization**: `sanitizeTextInput()` strips ASCII control characters and enforces bounded lengths (`MAX_TEXT_INPUT_LENGTH`).
2. **Safe URL Validation**: `validateSafeExternalUrl()` permits strictly `https://` links; blocks `javascript:` and `data:` schemes.
3. **Secure JSON Import**: Enforces `<= 25 MB` file limit, strict Zod `BackupEnvelopeSchema` validation, schema version bounds, and SHA-256 integrity verification before writing to IndexedDB or SQLite.
4. **Model Integrity Verification**:
   - Python verification script (`ai/scripts/verify_model_integrity.py`) checks SHA-256 digests against `manifest.sha256.json`.
   - Kotlin (`ExecuTorchLlamaModule.kt`) and Swift (`ExecuTorchLlamaModule.swift`) expose `verifyFileSha256()` using platform cryptographic digests before model loading.
5. **No Hardcoded Secrets**: Zero API keys, tokens, or credentials exist in the repository.
