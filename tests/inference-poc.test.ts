import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  NativeExecuTorchProvider,
  type NativeExecuTorchBridge,
} from '../packages/ai-adapters/src/index';
import {
  detectWebGPUCapabilities,
  WEB_DEFAULT_MODEL_F16,
  WebWebLLMProvider,
} from '../apps/web/src/ai/web-webllm-provider';

function createMockNativeBridge(overrides: Partial<NativeExecuTorchBridge> = {}): {
  bridge: NativeExecuTorchBridge;
  emitToken: (tok: string) => void;
} {
  let listener: ((ev: { token: string }) => void) | null = null;
  const bridge: NativeExecuTorchBridge = {
    getCapabilities: vi.fn(async () => ({
      platform: 'android',
      backend: 'xnnpack',
      availableRamMb: 4096,
      totalRamMb: 8192,
      supportedAbis: ['arm64-v8a'],
      isModelInstalled: false,
    })),
    loadModel: vi.fn(async () => {}),
    generate: vi.fn(async () => {
      listener?.({ token: 'DAGs ' });
      listener?.({ token: 'prevent cycles.' });
      return {
        text: 'DAGs prevent cycles.',
        statsJson: '{"num_generated_tokens":4,"tokens_per_sec":18.4}',
      };
    }),
    stop: vi.fn(async () => {}),
    resetContext: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
    addTokenListener: (cb) => {
      listener = cb;
      return {
        remove: () => {
          listener = null;
        },
      };
    },
    ...overrides,
  };
  return {
    bridge,
    emitToken: (tok: string) => listener?.({ token: tok }),
  };
}

describe('Phase 04 Local Llama Inference POC Contract, Diagnostics & Failure Modes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('verifies complete NativeExecuTorchProvider lifecycle: initialize, loadModel, generate, diagnostics, unloadModel', async () => {
    const { bridge } = createMockNativeBridge();
    const provider = new NativeExecuTorchProvider('android', bridge);

    await provider.initialize();
    expect(provider.getModelStatus().state).toBe('not_installed');

    await provider.loadModel({
      modelId: 'llama-3.2-1b-instruct-xnnpack-q4',
      modelPath: '/data/local/llama-3.2-1b.pte',
      tokenizerPath: '/data/local/tokenizer.model',
      temperature: 0.4,
    });

    const status = provider.getModelStatus();
    expect(status.state).toBe('ready');
    expect(status.offlineReady).toBe(true);
    expect(status.loadTimeMs).not.toBeNull();

    const streamed: string[] = [];
    const resp = await provider.generateStream(
      { messages: [{ role: 'user', content: 'Explain DAGs' }] },
      (tok) => streamed.push(tok),
    );
    expect(resp.text).toBe('DAGs prevent cycles.');
    expect(streamed).toEqual(['DAGs ', 'prevent cycles.']);
    expect(resp.stats.generatedTokens).toBe(4);
    expect(resp.stats.decodeTokensPerSec).toBe(18.4);

    const diag = await provider.getDiagnostics();
    expect(diag.compatible).toBe(true);
    expect(diag.offlineCached).toBe(true);
    expect(diag.totalDeviceRamMb).toBe(8192);
    expect(diag.availableMemoryMb).toBe(4096);

    await provider.unloadModel();
    expect(bridge.dispose).toHaveBeenCalledTimes(1);
    expect(provider.getModelStatus().state).toBe('installed');
  });

  it('rejects invalid model paths and surfaces native loadModel errors explicitly', async () => {
    const { bridge } = createMockNativeBridge({
      loadModel: vi.fn(async () => {
        throw new Error('ERR_INVALID_MODEL_FILE: corrupt .pte header');
      }),
    });
    const provider = new NativeExecuTorchProvider('android', bridge);

    await expect(
      provider.loadModel({ modelId: 'llama-3.2-1b-instruct-xnnpack-q4', modelPath: '', tokenizerPath: '' }),
    ).rejects.toThrow('requires valid local modelPath');
    expect(provider.getModelStatus().state).toBe('error');

    await expect(
      provider.loadModel({
        modelId: 'llama-3.2-1b-instruct-xnnpack-q4',
        modelPath: '/tmp/bad.pte',
        tokenizerPath: '/tmp/tokenizer.model',
      }),
    ).rejects.toThrow('ERR_INVALID_MODEL_FILE');
    expect(provider.getModelStatus().state).toBe('error');
    expect(provider.getModelStatus().offlineReady).toBe(false);
  });

  it('stops token emission cleanly on cancel() and reports iOS unlinked SPM diagnostics', async () => {
    let emit: ((ev: { token: string }) => void) | null = null;
    const { bridge } = createMockNativeBridge({
      getCapabilities: vi.fn(async () => ({
        platform: 'ios',
        backend: 'xnnpack',
        availableRamMb: 3200,
        totalRamMb: 6144,
        executorchLinked: false,
        isModelInstalled: false,
      })),
      addTokenListener: (cb) => {
        emit = cb;
        return { remove: () => { emit = null; } };
      },
      generate: vi.fn(async () => {
        emit?.({ token: 'Part1 ' });
        await provider.cancel();
        emit?.({ token: 'Part2_ShouldBeIgnored' });
        return { text: 'Part1 Part2_ShouldBeIgnored', statsJson: '{}' };
      }),
    });

    const provider = new NativeExecuTorchProvider('ios', bridge);
    const diag = await provider.getDiagnostics();
    expect(diag.compatible).toBe(false);
    expect(diag.compatibilityReason).toContain('ExecuTorchLLM');

    await provider.loadModel({
      modelId: 'llama-3.2-1b-instruct-xnnpack-q4',
      modelPath: '/var/mobile/llama.pte',
      tokenizerPath: '/var/mobile/tokenizer.model',
    });

    const received: string[] = [];
    const out = await provider.generateStream(
      { messages: [{ role: 'user', content: 'Test cancel' }] },
      (tok) => received.push(tok),
    );
    expect(bridge.stop).toHaveBeenCalledTimes(1);
    expect(received).toEqual(['Part1 ']);
    expect(out.text).toBe('Part1 ');
  });

  it('handles missing WebGPU gracefully and blocks uncached offline WebLLM load without remote fallback', async () => {
    vi.stubGlobal('navigator', { onLine: false });

    const caps = await detectWebGPUCapabilities();
    expect(caps.supported).toBe(false);

    const webProvider = new WebWebLLMProvider();
    await webProvider.initialize();
    expect(webProvider.getModelStatus().state).toBe('unsupported');

    await expect(
      webProvider.loadModel({ modelId: WEB_DEFAULT_MODEL_F16 }),
    ).rejects.toThrow(/WebGPU/i);
    expect(webProvider.getModelStatus().state).toBe('unsupported');

    // Simulate WebGPU present while offline & uncached
    vi.stubGlobal('navigator', {
      onLine: false,
      gpu: {
        requestAdapter: async () => ({
          features: new Set(['shader-f16']),
          info: { vendor: 'amd', architecture: 'rdna' },
        }),
      },
    });
    const offlineWebProvider = new WebWebLLMProvider();
    await expect(
      offlineWebProvider.loadModel({ modelId: WEB_DEFAULT_MODEL_F16 }),
    ).rejects.toThrow(/offline/i);
    expect(offlineWebProvider.getModelStatus().state).toBe('error');
    expect(offlineWebProvider.getModelStatus().offlineReady).toBe(false);
  });
});
