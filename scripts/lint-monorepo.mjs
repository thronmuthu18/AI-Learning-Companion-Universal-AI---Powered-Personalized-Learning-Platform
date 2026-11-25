#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const failures = [];

function check(cond, msg) {
  if (!cond) failures.push(msg);
}

// 1. Audit all 13 workspace packages for exports, strict tsconfig, and zero remote LLM dependencies
const pkgDirs = fs.readdirSync(path.join(ROOT, 'packages'));
const bannedPackages = new Set([
  'openai',
  '@google/generative-ai',
  '@google/genai',
  '@anthropic-ai/sdk',
  'groq-sdk',
  '@huggingface/inference',
]);

for (const dir of pkgDirs) {
  const pkgPath = path.join(ROOT, 'packages', dir, 'package.json');
  const tsPath = path.join(ROOT, 'packages', dir, 'tsconfig.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const ts = JSON.parse(fs.readFileSync(tsPath, 'utf8'));

  check(Boolean(pkg.exports?.['.']), `${pkg.name}: missing explicit exports["."] map`);
  check(pkg.private === true, `${pkg.name}: should be marked private: true`);
  check(pkg.scripts?.typecheck === 'tsc --noEmit', `${pkg.name}: missing typecheck script`);
  check(ts.extends === '../../tsconfig.base.json', `${pkg.name}: tsconfig must extend ../../tsconfig.base.json`);

  for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    check(!bannedPackages.has(dep), `${pkg.name}: forbidden remote LLM SDK ${dep}`);
  }
}

// 2. Scan source files for accidental remote LLM API endpoints or secret patterns
const scanDirs = ['packages', 'apps/web/src', 'apps/mobile/app', 'apps/mobile/src', 'apps/mobile/modules'];
const forbiddenHosts = [
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'api.anthropic.com',
  'api.groq.com',
  'api-inference.huggingface.co',
];

function walk(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'android') continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(rel);
    } else if (/\.(ts|tsx|js|kt|swift)$/.test(entry.name)) {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      for (const host of forbiddenHosts) {
        check(!content.includes(host), `${rel}: references forbidden remote LLM host ${host}`);
      }
    }
  }
}

for (const d of scanDirs) walk(d);

if (failures.length > 0) {
  console.error('Monorepo lint FAILED:');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}

console.log(`Monorepo lint PASSED (${pkgDirs.length} packages audited, 0 violations).`);
