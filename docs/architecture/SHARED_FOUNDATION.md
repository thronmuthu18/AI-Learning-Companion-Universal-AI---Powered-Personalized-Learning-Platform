# SHARED FOUNDATION — AI Learning Companion

## 1. Monorepo Workspace Layout (`15` Workspaces)
- **Root (`package.json`):** Manages `packages/*` (13 shared packages) and `apps/*` (`@alc/web`, `@alc/mobile`) via npm workspaces, unified `react@19.2.0` / `react-dom@19.2.0` overrides, and top-level verification scripts:
  - `npm run lint` -> runs `scripts/lint-monorepo.mjs` (package manifest audit + remote LLM host scan)
  - `npm run typecheck` -> runs `tsc --noEmit` across all 15 workspaces
  - `npm test` -> runs `vitest run` across all 5 test suites
  - `npm run web:build` -> compiles `@alc/web` TypeScript & Vite production PWA bundle
  - `npm run verify` -> runs `lint` + `typecheck` + `test` + `web:build` sequentially

## 2. TypeScript Strictness (`tsconfig.base.json`)
All 15 workspaces inherit:
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `isolatedModules: true`
- `forceConsistentCasingInFileNames: true`
- `resolveJsonModule: true`
- `target: "ES2022"`, `moduleResolution: "bundler"`

## 3. Clean Lockfile Installation
- Lockfile (`package-lock.json`) tracks all 760+ resolved packages with `react@19.2.0` deduplicated across Web and Mobile.
- Verified with `npm ci --dry-run` (see `TEST_RESULTS.md`).
