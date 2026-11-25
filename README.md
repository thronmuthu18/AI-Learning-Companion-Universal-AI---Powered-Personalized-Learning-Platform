# AI Learning Companion

> **Built with Llama** — Offline-first, AI-powered personalised learning ecosystem for **Web (PWA + WebLLM)**, **Android (ExecuTorch Kotlin)**, and **iOS (ExecuTorch Swift)**.

## Overview

AI Learning Companion is an end-to-end educational intelligence platform that diagnoses verified competencies, enforces prerequisite safety via a directed acyclic skill graph, builds personalised roadmaps and realistic study schedules, tracks database-backed progress, adapts deterministically to performance, and runs **Meta Llama 3.2 1B Instruct** locally on-device with **zero remote LLM APIs**.

## Monorepo Architecture

```
ai-learning-companion/
├── apps/
│   ├── web/              # React 19 + Vite + PWA + IndexedDB + @mlc-ai/web-llm (WebGPU)
│   └── mobile/           # Expo SDK 55 + Expo Router + expo-sqlite + Custom Native ExecuTorch Modules
├── packages/
│   ├── shared-types/     # Canonical domain entities & navigation screen contracts
│   ├── validation/       # Zod schemas for inputs, backups, and Llama structured JSON outputs
│   ├── design-system/    # Deep navy/charcoal + violet/blue/cyan EdTech design tokens
│   ├── skill-graph/      # Directed prerequisite graph, 3-color cycle detection, Kahn topological sort
│   ├── assessment-engine/# Diagnostic & quiz evaluation, confidence vs competence calibration
│   ├── study-planner/    # Daily/weekly/monthly scheduling, feasibility detection, missed replanning
│   ├── progress-engine/  # Strictly DB-backed progress, streaks, and 7-day rollups
│   ├── adaptive-engine/  # Deterministic adaptation triggers
│   ├── learning-engine/  # 13 goal templates, skill-gap analyzer, roadmap builder
│   ├── resource-management/ # Bundled offline lessons, diagnostic bank, quizzes, external docs
│   ├── storage/          # Versioned SQLite migrations, Repository contract, SHA-256 JSON backup
│   ├── ai-contracts/     # LocalAIProvider interface & Llama 3.2 Instruct prompt templates
│   └── ai-adapters/      # LocalAIAdvisoryService & NativeExecuTorchProvider
├── ai/
│   ├── model-config/     # Model registry (Llama 3.2 1B Instruct XNNPACK / WebGPU variants)
│   ├── conversion/       # Reproducible Python ExecuTorch .pte export scripts
│   └── scripts/          # SHA-256 model integrity verification CLI
├── docs/                 # Architecture, DB schema, AI deployment, security, testing reports
└── tests/                # Vitest unit & cross-package integration tests
```

## Quick Start

### Prerequisites
- Node.js `>= 20.0.0` (verified on `v22.17.0`) and npm `>= 10.0.0`
- Python `>= 3.10` (for ExecuTorch `.pte` model export & SHA-256 scripts)
- Chrome / Edge with WebGPU enabled (for browser-side WebLLM inference)
- Android SDK + JDK 21 (for Android native APK compilation)
- macOS + Xcode (required for iOS compilation & physical iPhone testing)

### Install, Typecheck & Test
```bash
npm install
npm run typecheck
npm test
```

### Run Web PWA (WebLLM + IndexedDB)
```bash
npm run web:dev
npm run web:build
```

### Export Meta Llama 3.2 1B for Mobile ExecuTorch
```bash
# Requires accepting Meta Llama 3.2 Community License on Hugging Face and setting HF_TOKEN
python ai/conversion/export_llama_executorch.py --output-dir ai/exports/llama-3.2-1b
python ai/scripts/verify_model_integrity.py ai/exports/llama-3.2-1b
```

## Licensing & Attribution
Application source code is licensed under MIT (`LICENSE`). Local Llama inference utilizes Meta Llama 3.2 (`NOTICE`), governed by the Meta Llama 3.2 Community License Agreement.
