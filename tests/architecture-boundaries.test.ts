import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function readJson<T>(relPath: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8')) as T;
}

describe('Phase 03 Architecture Boundaries & Dependency Rules', () => {
  const pkgDirs = fs.readdirSync(path.join(ROOT, 'packages'));
  const manifests = pkgDirs.map((dir) => ({
    dir,
    pkg: readJson<{
      name: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }>(path.join('packages', dir, 'package.json')),
  }));

  it('maintains a strictly acyclic workspace dependency graph across all 13 packages', () => {
    const depsMap = new Map<string, string[]>();
    for (const { pkg } of manifests) {
      const internal = Object.keys(pkg.dependencies ?? {}).filter((d) => d.startsWith('@alc/'));
      depsMap.set(pkg.name, internal);
    }

    const state = new Map<string, 0 | 1 | 2>();
    const hasCycle = (node: string): boolean => {
      state.set(node, 1);
      for (const dep of depsMap.get(node) ?? []) {
        const s = state.get(dep) ?? 0;
        if (s === 1 || (s === 0 && hasCycle(dep))) return true;
      }
      state.set(node, 2);
      return false;
    };

    for (const name of depsMap.keys()) {
      expect(hasCycle(name)).toBe(false);
    }
    expect(manifests.length).toBe(13);
  });

  it('forbids remote LLM inference SDKs across root, packages, and both apps', () => {
    const forbidden = [
      'openai',
      '@google/generative-ai',
      '@google/genai',
      '@anthropic-ai/sdk',
      'groq-sdk',
      '@huggingface/inference',
    ];
    const allTargets = [
      'package.json',
      'apps/web/package.json',
      'apps/mobile/package.json',
      ...pkgDirs.map((d) => path.join('packages', d, 'package.json')),
    ];

    for (const rel of allTargets) {
      const json = readJson<{
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      }>(rel);
      const allDeps = { ...json.dependencies, ...json.devDependencies };
      for (const banned of forbidden) {
        expect(allDeps[banned], `${rel} must not depend on ${banned}`).toBeUndefined();
      }
    }
  });

  it('keeps @mlc-ai/web-llm isolated to apps/web and excludes it from apps/mobile', () => {
    const webPkg = readJson<{ dependencies?: Record<string, string> }>('apps/web/package.json');
    const mobilePkg = readJson<{ dependencies?: Record<string, string> }>('apps/mobile/package.json');
    expect(webPkg.dependencies?.['@mlc-ai/web-llm']).toBeDefined();
    expect(mobilePkg.dependencies?.['@mlc-ai/web-llm']).toBeUndefined();
  });

  it('wires all 27 AppScreenId routes inside apps/web/src/App.tsx', () => {
    const sharedTypesSrc = fs.readFileSync(
      path.join(ROOT, 'packages/shared-types/src/index.ts'),
      'utf8',
    );
    const appSrc = fs.readFileSync(path.join(ROOT, 'apps/web/src/App.tsx'), 'utf8');

    const unionBlock = sharedTypesSrc.match(/export type AppScreenId\s*=([\s\S]*?);/);
    expect(unionBlock).not.toBeNull();

    const screenIds = Array.from(unionBlock![1]!.matchAll(/'([a-z_]+)'/g)).map((m) => m[1]!);
    expect(screenIds.length).toBe(28);

    for (const id of screenIds) {
      expect(appSrc, `Missing case for screen '${id}' in apps/web/src/App.tsx`).toContain(
        `case '${id}':`,
      );
    }
  });
});
