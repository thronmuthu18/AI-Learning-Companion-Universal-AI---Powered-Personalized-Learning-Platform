import {
  buildGoalInterpretationMessages,
  buildRoadmapAdvisoryMessages,
  buildSkillGapExplanationMessages,
  buildTutorMessages,
  formatLlama32InstructPrompt,
  type AICapabilities,
  type AIGenerateRequest,
  type AIGenerateResponse,
  type AIInitConfig,
  type AIProgressCallback,
  type AITokenCallback,
  type InferenceStats,
  type LocalAIProvider,
  type ModelDeviceDiagnostics,
  type ModelStatusSnapshot,
} from '@alc/ai-contracts';
import {
  AIGoalInterpretationSchema,
  AIRoadmapAdvisorySchema,
  AISkillGapExplanationSchema,
  type AIGoalInterpretation,
  type AIRoadmapAdvisory,
  type AISkillGapExplanation,
} from '@alc/validation';

export interface SafeParseSchema<T> {
  safeParse(input: unknown):
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };
}

/**
 * Extracts and validates structured JSON output from local Llama responses.
 */
export function extractAndValidateJson<T>(
  rawText: string,
  schema: SafeParseSchema<T>,
): { ok: true; data: T } | { ok: false; error: string } {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const candidate =
    firstBrace !== -1 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

  try {
    const parsed = JSON.parse(candidate);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return {
        ok: false,
        error: result.error.issues.map((i) => `${i.path.map(String).join('.')}: ${i.message}`).join('; '),
      };
    }
    return { ok: true, data: result.data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to parse JSON from local Llama output.',
    };
  }
}

/**
 * High-level advisory service enforcing schema validation on all structured AI outputs.
 * Never returns fabricated responses if the local model is unavailable.
 */
export class LocalAIAdvisoryService {
  constructor(private readonly provider: LocalAIProvider) {}

  async interpretGoal(
    rawGoalText: string,
    availableSlugs: string[],
  ): Promise<{ ok: true; data: AIGoalInterpretation; stats: InferenceStats } | { ok: false; error: string }> {
    const messages = buildGoalInterpretationMessages(rawGoalText, availableSlugs);
    const response = await this.provider.generate({
      messages,
      maxTokens: 360,
      temperature: 0.2,
      jsonMode: true,
    });
    const validated = extractAndValidateJson(response.text, AIGoalInterpretationSchema);
    if (!validated.ok) return validated;
    return { ok: true, data: validated.data, stats: response.stats };
  }

  async explainSkillGap(
    summaryPayload: string,
  ): Promise<{ ok: true; data: AISkillGapExplanation; stats: InferenceStats } | { ok: false; error: string }> {
    const messages = buildSkillGapExplanationMessages(summaryPayload);
    const response = await this.provider.generate({
      messages,
      maxTokens: 360,
      temperature: 0.3,
      jsonMode: true,
    });
    const validated = extractAndValidateJson(response.text, AISkillGapExplanationSchema);
    if (!validated.ok) return validated;
    return { ok: true, data: validated.data, stats: response.stats };
  }

  async adviseRoadmap(
    roadmapPayload: string,
  ): Promise<{ ok: true; data: AIRoadmapAdvisory; stats: InferenceStats } | { ok: false; error: string }> {
    const messages = buildRoadmapAdvisoryMessages(roadmapPayload);
    const response = await this.provider.generate({
      messages,
      maxTokens: 420,
      temperature: 0.35,
      jsonMode: true,
    });
    const validated = extractAndValidateJson(response.text, AIRoadmapAdvisorySchema);
    if (!validated.ok) return validated;
    return { ok: true, data: validated.data, stats: response.stats };
  }

  async askTutorStream(
    learnerContext: string,
    question: string,
    onToken: AITokenCallback,
  ): Promise<AIGenerateResponse> {
    const messages = buildTutorMessages({ learnerContext, question });
    return this.provider.generateStream(
      {
        messages,
        maxTokens: 512,
        temperature: 0.5,
      },
      onToken,
    );
  }
}

export interface NativeExecuTorchBridge {
  getCapabilities(): Promise<{
    platform: 'android' | 'ios';
    backend: 'xnnpack' | 'coreml' | 'mps';
    availableRamMb: number;
    totalRamMb?: number;
    supportedAbis?: string[];
    executorchLinked?: boolean;
    isModelInstalled: boolean;
  }>;
  verifyFileSha256?(filePath: string): Promise<string>;
  loadModel(modelPath: string, tokenizerPath: string, temperature: number): Promise<void>;
  generate(
    prompt: string,
    seqLen: number,
    temperature: number,
  ): Promise<{ text: string; statsJson: string }>;
  stop(): Promise<void>;
  resetContext(): Promise<void>;
  dispose(): Promise<void>;
  addTokenListener(cb: (event: { token: string }) => void): { remove: () => void };
}

/**
 * Shared TypeScript adapter driving the native Kotlin (Android) and Swift (iOS)
 * ExecuTorch Expo Modules.
 */
export class NativeExecuTorchProvider implements LocalAIProvider {
  private status: ModelStatusSnapshot;
  private isCancelled = false;
  private activeConfig: AIInitConfig | null = null;

  constructor(
    private readonly platform: 'android' | 'ios',
    private readonly bridge: NativeExecuTorchBridge,
    defaultModelId = 'llama-3.2-1b-instruct-xnnpack-q4',
  ) {
    this.status = {
      modelId: defaultModelId,
      state: 'not_installed',
      progressPercent: 0,
      statusMessage: 'Local ExecuTorch .pte model not loaded.',
      errorMessage: null,
      loadTimeMs: null,
      offlineReady: false,
      lastStats: null,
    };
  }

  async getCapabilities(): Promise<AICapabilities> {
    const nativeCaps = await this.bridge.getCapabilities();
    return {
      platform: this.platform,
      runtime: this.platform === 'android' ? 'executorch-android' : 'executorch-ios',
      backend: nativeCaps.backend,
      hardwareAccelerated: nativeCaps.backend !== 'xnnpack',
      supportsStreaming: true,
      maxContextTokens: 2048,
      estimatedRamMb: nativeCaps.totalRamMb ?? nativeCaps.availableRamMb,
      availableMemoryMb: nativeCaps.availableRamMb,
      supportedAbis: nativeCaps.supportedAbis,
      executorchLinked: nativeCaps.executorchLinked,
    };
  }

  async getDiagnostics(): Promise<ModelDeviceDiagnostics> {
    const caps = await this.getCapabilities();
    const sufficientRam = (caps.estimatedRamMb || 0) >= 2048;
    const iosLinked = this.platform !== 'ios' || caps.executorchLinked !== false;
    const compatible = sufficientRam && iosLinked;

    return {
      platform: this.platform,
      runtime: caps.runtime,
      modelId: this.status.modelId,
      compatible,
      compatibilityReason: !iosLinked
        ? 'ExecuTorchLLM Swift Package not linked in current binary.'
        : !sufficientRam
          ? `Device reports ${caps.estimatedRamMb} MB RAM (< 2048 MB recommended minimum).`
          : 'Device meets RAM and ExecuTorch runtime requirements.',
      cpuBackend: 'XNNPACK (ARM64/x86_64)',
      gpuBackend: this.platform === 'ios' ? 'MPS/CoreML (optional)' : 'CPU XNNPACK primary',
      webgpuAvailable: false,
      supportsShaderF16: false,
      totalDeviceRamMb: caps.estimatedRamMb || null,
      availableMemoryMb: caps.availableMemoryMb ?? null,
      requiredStorageMb: 780,
      availableStorageMb: null,
      offlineCached: this.status.offlineReady,
      loadTimeMs: this.status.loadTimeMs,
      lastInferenceStats: this.status.lastStats,
      state: this.status.state,
    };
  }

  async initialize(config?: AIInitConfig, onProgress?: AIProgressCallback): Promise<void> {
    if (config) {
      this.activeConfig = config;
    }
    if (config?.modelPath && config?.tokenizerPath) {
      await this.loadModel(config, onProgress);
      return;
    }
    const caps = await this.getCapabilities();
    this.status = {
      ...this.status,
      modelId: config?.modelId ?? this.status.modelId,
      statusMessage: `ExecuTorch runtime ready (${caps.backend}). Select .pte & tokenizer files to load model.`,
    };
  }

  async loadModel(config: AIInitConfig, onProgress?: AIProgressCallback): Promise<void> {
    this.activeConfig = config;
    if (!config.modelPath || !config.tokenizerPath) {
      const msg = 'ExecuTorch requires valid local modelPath (.pte) and tokenizerPath (.model).';
      this.status = {
        ...this.status,
        modelId: config.modelId,
        state: 'error',
        statusMessage: 'Invalid model configuration.',
        errorMessage: msg,
        offlineReady: false,
      };
      throw new Error(msg);
    }
    this.status = {
      ...this.status,
      modelId: config.modelId,
      state: 'loading',
      progressPercent: 25,
      statusMessage: 'Loading ExecuTorch .pte weights into native runtime...',
      errorMessage: null,
    };
    onProgress?.({ progressPercent: 25, text: this.status.statusMessage });

    const loadStart = Date.now();
    try {
      await this.bridge.loadModel(
        config.modelPath,
        config.tokenizerPath,
        config.temperature ?? 0.6,
      );
      const loadTimeMs = Date.now() - loadStart;
      this.status = {
        ...this.status,
        state: 'ready',
        progressPercent: 100,
        statusMessage: `ExecuTorch Llama runtime ready offline (loaded in ${loadTimeMs}ms).`,
        errorMessage: null,
        loadTimeMs,
        offlineReady: true,
      };
      onProgress?.({ progressPercent: 100, text: this.status.statusMessage });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ExecuTorch model load failed.';
      this.status = {
        ...this.status,
        state: 'error',
        statusMessage: 'Model load failed.',
        errorMessage: msg,
        offlineReady: false,
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
    if (this.status.state !== 'ready') {
      throw new Error('ExecuTorch Llama runtime is not ready. Load the local .pte model first.');
    }

    this.isCancelled = false;
    this.status = {
      ...this.status,
      state: 'generating',
      statusMessage: 'Generating locally via ExecuTorch...',
    };

    const start = Date.now();
    let accumulated = '';
    const subscription = this.bridge.addTokenListener((ev) => {
      if (this.isCancelled) return;
      accumulated += ev.token;
      onToken(ev.token, accumulated);
    });

    try {
      // Clear KV cache between independent requests to keep prompts isolated
      await this.bridge.resetContext();
      const formattedPrompt = formatLlama32InstructPrompt(request.messages);
      const result = await this.bridge.generate(
        formattedPrompt,
        request.maxTokens ?? 512,
        request.temperature ?? 0.6,
      );

      const totalTimeMs = Date.now() - start;
      let decodeTps: number | null = null;
      let generatedTokens: number | null = null;
      try {
        const parsedStats = JSON.parse(result.statsJson || '{}') as Record<string, unknown>;
        if (typeof parsedStats.tokens_per_sec === 'number') {
          decodeTps = Number(parsedStats.tokens_per_sec.toFixed(2));
        }
        if (typeof parsedStats.num_generated_tokens === 'number') {
          generatedTokens = parsedStats.num_generated_tokens;
        }
      } catch {
        // Ignore malformed native stats string
      }

      const stats: InferenceStats = {
        prefillTimeMs: null,
        decodeTokensPerSec: decodeTps,
        generatedTokens,
        totalTimeMs,
      };

      this.status = {
        ...this.status,
        state: 'ready',
        statusMessage: 'ExecuTorch Llama runtime ready (offline).',
        lastStats: stats,
      };

      return {
        text: this.isCancelled ? accumulated : result.text || accumulated,
        stats,
        modelId: this.status.modelId,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ExecuTorch generation error.';
      this.status = {
        ...this.status,
        state: 'error',
        errorMessage: msg,
        statusMessage: 'Generation failed.',
      };
      throw err;
    } finally {
      subscription.remove();
    }
  }

  async cancel(): Promise<void> {
    this.isCancelled = true;
    await this.bridge.stop();
    if (this.status.state === 'generating') {
      this.status = { ...this.status, state: 'ready', statusMessage: 'Generation cancelled.' };
    }
  }

  async unloadModel(): Promise<void> {
    await this.bridge.dispose();
    this.status = {
      ...this.status,
      state: this.activeConfig ? 'installed' : 'not_installed',
      progressPercent: 0,
      statusMessage: 'ExecuTorch model unloaded from memory.',
    };
  }

  async dispose(): Promise<void> {
    await this.unloadModel();
  }

  getModelStatus(): ModelStatusSnapshot {
    return { ...this.status };
  }
}
