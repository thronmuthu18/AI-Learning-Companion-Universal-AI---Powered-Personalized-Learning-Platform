import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@alc/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@alc/validation': path.resolve(__dirname, '../../packages/validation/src/index.ts'),
      '@alc/design-system': path.resolve(__dirname, '../../packages/design-system/src/index.ts'),
      '@alc/skill-graph': path.resolve(__dirname, '../../packages/skill-graph/src/index.ts'),
      '@alc/assessment-engine': path.resolve(__dirname, '../../packages/assessment-engine/src/index.ts'),
      '@alc/study-planner': path.resolve(__dirname, '../../packages/study-planner/src/index.ts'),
      '@alc/progress-engine': path.resolve(__dirname, '../../packages/progress-engine/src/index.ts'),
      '@alc/adaptive-engine': path.resolve(__dirname, '../../packages/adaptive-engine/src/index.ts'),
      '@alc/learning-engine': path.resolve(__dirname, '../../packages/learning-engine/src/index.ts'),
      '@alc/resource-management': path.resolve(__dirname, '../../packages/resource-management/src/index.ts'),
      '@alc/storage': path.resolve(__dirname, '../../packages/storage/src/index.ts'),
      '@alc/ai-contracts': path.resolve(__dirname, '../../packages/ai-contracts/src/index.ts'),
      '@alc/ai-adapters': path.resolve(__dirname, '../../packages/ai-adapters/src/index.ts'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1800,
  },
});
