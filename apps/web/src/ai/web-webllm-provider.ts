import {
  CreateMLCEngine,
  CreateWebWorkerMLCEngine,
  deleteModelAllInfoInCache,
  hasModelInCache,
  type MLCEngineInterface,
} from '@mlc-ai/web-llm';
import type {
  AICapabilities,
  AIGenerateRequest,
  AIGenerateResponse,
  AIInitConfig,
  AIProgressCallback,
  AITokenCallback,
  LocalAIProvider,
  ModelDeviceDiagnostics,
  ModelStatusSnapshot,
} from '@alc/ai-contracts';

export const WEB_DEFAULT_MODEL_F16 = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
export const WEB_FALLBACK_MODEL_F32 = 'Llama-3.2-1B-Instruct-q4f32_1-MLC';

export async function detectWebGPUCapabilities(): Promise<{
  supported: boolean;
  supportsShaderF16: boolean;
  adapterInfo: string;
  reason?: string;
}> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return {
      supported: false,
      supportsShaderF16: false,
      adapterInfo: 'Unavailable',
      reason: 'Browser does not expose navigator.gpu (WebGPU). Use Chrome/Edge 113+ with WebGPU enabled.',
    };
  }

  try {
    const gpu = (navigator as Navigator & { gpu: GPU }).gpu;
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        supportsShaderF16: false,
        adapterInfo: 'No GPU Adapter',
        reason: 'No compatible WebGPU hardware adapter was found.',
      };
    }
    const supportsShaderF16 = adapter.features.has('shader-f16');
    const info = (adapter as GPUAdapter & { info?: { architecture?: string; vendor?: string } }).info;
    const adapterLabel = info
      ? `${info.vendor ?? 'GPU'} ${info.architecture ?? ''}`.trim()
      : 'WebGPU Adapter Ready';
    return {
      supported: true,
      supportsShaderF16,
      adapterInfo: adapterLabel,
    };
  } catch (err) {
    return {
      supported: false,
      supportsShaderF16: false,
      adapterInfo: 'Error',
      reason: err instanceof Error ? err.message : 'WebGPU capability check failed.',
    };
  }
}

export class WebWebLLMProvider implements LocalAIProvider {
  private engine: MLCEngineInterface | null = null;
  private worker: Worker | null = null;
  private status: ModelStatusSnapshot = {
    modelId: WEB_DEFAULT_MODEL_F16,
    state: 'not_installed',
    progressPercent: 0,
    statusMessage: 'Local Llama 3.2 WebGPU model not initialized yet.',
    errorMessage: null,
    loadTimeMs: null,
    offlineReady: false,
    lastStats: null,
  };

  async isModelCached(modelId = this.status.modelId): Promise<boolean> {
    try {
      return await hasModelInCache(modelId);
    } catch {
      return false;
    }
  }

  async deleteCachedModel(modelId = this.status.modelId): Promise<void> {
    if (this.engine && this.status.modelId === modelId) {
      await this.unloadModel();
    }
    await deleteModelAllInfoInCache(modelId);
    this.status = {
      ...this.status,
      modelId,
      state: 'not_installed',
      progressPercent: 0,
      statusMessage: 'Cached model weights removed from browser storage.',
      errorMessage: null,
      loadTimeMs: null,
      offlineReady: false,
    };
  }

  async getCapabilities(): Promise<AICapabilities> {
    const gpuCaps = await detectWebGPUCapabilities();
    const deviceMemGb =
      typeof navigator !== 'undefined' && 'deviceMemory' in navigator
        ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0)
        : 0;
    return {
      platform: 'web',
      runtime: 'webllm',
      backend: gpuCaps.supported ? 'webgpu' : 'unsupported',
      hardwareAccelerated: gpuCaps.supported,
      supportsStreaming: true,
      supportsShaderF16: gpuCaps.supportsShaderF16,
      gpuAdapterInfo: gpuCaps.adapterInfo,
      maxContextTokens: 4096,
      estimatedRamMb: deviceMemGb > 0 ? Math.round(deviceMemGb * 1024) : 879,
      availableMemoryMb: deviceMemGb > 0 ? Math.round(deviceMemGb * 1024) : null,
      reasonIfUnsupported: gpuCaps.reason,
    };
  }

  async getDiagnostics(): Promise<ModelDeviceDiagnostics> {
    const caps = await this.getCapabilities();
    const cached = await this.isModelCached(this.status.modelId);
    let availableStorageMb: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      try {
        const est = await navigator.storage.estimate();
        if (typeof est.quota === 'number' && typeof est.usage === 'number') {
          availableStorageMb = Math.max(0, Math.round((est.quota - est.usage) / (1024 * 1024)));
        }
      } catch {
        // Storage estimate unavailable
      }
    }

    const requiredStorageMb = this.status.modelId.includes('3B')
      ? 2263
      : this.status.modelId.includes('q4f32_1')
        ? 1120
        : 879;

    const compatible = caps.backend === 'webgpu';
    return {
      platform: 'web',
      runtime: 'webllm',
      modelId: this.status.modelId,
      compatible,
      compatibilityReason: compatible
        ? `WebGPU ready (${caps.gpuAdapterInfo ?? 'Adapter'}; shader-f16=${Boolean(caps.supportsShaderF16)}).`
        : caps.reasonIfUnsupported ?? 'WebGPU unavailable in this browser.',
      cpuBackend: 'WebAssembly (Worker fallback)',
      gpuBackend: caps.backend === 'webgpu' ? `WebGPU (${caps.gpuAdapterInfo ?? 'Adapter'})` : 'Unavailable',
      webgpuAvailable: caps.backend === 'webgpu',
      supportsShaderF16: Boolean(caps.supportsShaderF16),
      totalDeviceRamMb: caps.availableMemoryMb ?? null,
      availableMemoryMb: caps.availableMemoryMb ?? null,
      requiredStorageMb,
      availableStorageMb,
      offlineCached: cached,
      loadTimeMs: this.status.loadTimeMs,
      lastInferenceStats: this.status.lastStats,
      state: this.status.state,
    };
  }

  async initialize(config?: AIInitConfig, onProgress?: AIProgressCallback): Promise<void> {
    if (config) {
      await this.loadModel(config, onProgress);
      return;
    }
    const caps = await this.getCapabilities();
    const cached = await this.isModelCached(this.status.modelId);
    this.status = {
      ...this.status,
      state: !caps.hardwareAccelerated ? 'unsupported' : cached ? 'installed' : 'not_installed',
      offlineReady: cached,
      statusMessage: !caps.hardwareAccelerated
        ? caps.reasonIfUnsupported ?? 'WebGPU unavailable.'
        : cached
          ? 'Cached model found locally. Call loadModel() to mount into WebGPU.'
          : 'WebGPU ready. Call loadModel() to download and cache Llama 3.2.',
      errorMessage: !caps.hardwareAccelerated ? caps.reasonIfUnsupported ?? 'WebGPU unavailable' : null,
    };
  }

  async loadModel(config: AIInitConfig, onProgress?: AIProgressCallback): Promise<void> {
    const gpuCaps = await detectWebGPUCapabilities();
    if (!gpuCaps.supported) {
      this.status = {
        ...this.status,
        modelId: config.modelId,
        state: 'unsupported',
        statusMessage: 'WebGPU unavailable',
        errorMessage: gpuCaps.reason ?? 'WebGPU is required for local browser Llama inference.',
        offlineReady: false,
      };
      throw new Error(this.status.errorMessage ?? 'WebGPU unsupported');
    }

    const effectiveModelId =
      config.modelId === WEB_DEFAULT_MODEL_F16 && !gpuCaps.supportsShaderF16
        ? WEB_FALLBACK_MODEL_F32
        : config.modelId;

    const cached = await this.isModelCached(effectiveModelId);
    if (!cached && typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineMsg =
        'Browser is offline and model weights are not cached locally yet. Reconnect once to cache Llama 3.2 weights, then offline inference works permanently.';
      this.status = {
        ...this.status,
        modelId: effectiveModelId,
        state: 'error',
        statusMessage: 'Offline before model cached',
        errorMessage: offlineMsg,
        offlineReady: false,
      };
      throw new Error(offlineMsg);
    }

    this.status = {
      modelId: effectiveModelId,
      state: cached ? 'loading' : 'downloading',
      progressPercent: 0,
      statusMessage: cached
        ? `Loading cached ${effectiveModelId} into WebGPU...`
        : `Downloading & caching ${effectiveModelId} (~879 MB)...`,
      errorMessage: null,
      loadTimeMs: null,
      offlineReady: cached,
      lastStats: null,
    };

    const progressCb = (report: { progress: number; text: string }) => {
      const pct = Math.round(report.progress * 100);
      this.status = {
        ...this.status,
        state: pct < 95 ? (cached ? 'loading' : 'downloading') : 'loading',
        progressPercent: pct,
        statusMessage: report.text,
      };
      onProgress?.({ progressPercent: pct, text: report.text });
    };

    const loadStarted = performance.now();
    try {
      await this.unloadModel();
      if (typeof Worker !== 'undefined') {
        this.worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), {
          type: 'module',
        });
        this.engine = await CreateWebWorkerMLCEngine(this.worker, effectiveModelId, {
          initProgressCallback: progressCb,
        });
      } else {
        this.engine = await CreateMLCEngine(effectiveModelId, {
          initProgressCallback: progressCb,
        });
      }

      const loadTimeMs = Math.round(performance.now() - loadStarted);
      this.status = {
        modelId: effectiveModelId,
        state: 'ready',
        progressPercent: 100,
        statusMessage: `Local ${effectiveModelId} ready on WebGPU (loaded in ${loadTimeMs}ms, offline-capable).`,
        errorMessage: null,
        loadTimeMs,
        offlineReady: true,
        lastStats: null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize WebLLM engine.';
      this.status = {
        ...this.status,
        modelId: effectiveModelId,
        state: 'error',
        statusMessage: 'WebLLM initialization failed',
        errorMessage: msg,
        offlineReady: cached,
      };
      throw err;
    }
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    return this.generateStream(request, () => {});
  }

  async generateStream(
    request: AIGenerateRequest,
    onToken: AITokenCallback,
  ): Promise<AIGenerateResponse> {
    if (!this.engine || (this.status.state !== 'ready' && this.status.state !== 'installed')) {
      throw new Error('Local Llama WebGPU engine is not loaded. Initialize the model in Offline Model Settings first.');
    }

    this.status = {
      ...this.status,
      state: 'generating',
      statusMessage: 'Running local WebGPU inference...',
    };

    const startedAt = performance.now();
    let firstTokenAt: number | null = null;
    let accumulated = '';
    let tokenCount = 0;

    try {
      const stream = await this.engine.chat.completions.create({
        messages: request.messages,
        temperature: request.temperature ?? 0.4,
        max_tokens: request.maxTokens ?? 420,
        stream: true,
        stream_options: { include_usage: true },
      });

      let decodeTps: number | null = null;
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) {
          if (firstTokenAt === null) firstTokenAt = performance.now();
          accumulated += delta;
          tokenCount += 1;
          onToken(delta, accumulated);
        }
        if (chunk.usage?.extra?.decode_tokens_per_s) {
          decodeTps = Number(chunk.usage.extra.decode_tokens_per_s.toFixed(2));
        }
      }

      const totalTimeMs = Math.round(performance.now() - startedAt);
      const prefillTimeMs = firstTokenAt !== null ? Math.round(firstTokenAt - startedAt) : null;
      const stats = {
        prefillTimeMs,
        decodeTokensPerSec:
          decodeTps ?? (totalTimeMs > 0 ? Number(((tokenCount * 1000) / totalTimeMs).toFixed(2)) : null),
        generatedTokens: tokenCount,
        totalTimeMs,
      };

      this.status = {
        ...this.status,
        state: 'ready',
        statusMessage: `Local ${this.status.modelId} ready on WebGPU.`,
        lastStats: stats,
      };

      return {
        text: accumulated,
        stats,
        modelId: this.status.modelId,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Local WebGPU inference failed.';
      this.status = {
        ...this.status,
        state: 'error',
        errorMessage: msg,
        statusMessage: 'Generation error',
      };
      throw err;
    }
  }

  async cancel(): Promise<void> {
    if (this.engine) {
      await this.engine.interruptGenerate();
    }
    if (this.status.state === 'generating') {
      this.status = {
        ...this.status,
        state: 'ready',
        statusMessage: 'Generation cancelled.',
      };
    }
  }

  async unloadModel(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    const cached = await this.isModelCached(this.status.modelId);
    this.status = {
      ...this.status,
      state: cached ? 'installed' : 'not_installed',
      progressPercent: cached ? 100 : 0,
      statusMessage: cached
        ? 'Model unloaded from GPU memory (weights remain cached offline).'
        : 'Model unloaded.',
      offlineReady: cached,
    };
  }

  async dispose(): Promise<void> {
    await this.unloadModel();
  }

  getModelStatus(): ModelStatusSnapshot {
    return { ...this.status };
  }
}
