import { describe, expect, it, vi } from 'vitest';
import {
  LocalAIAdvisoryService,
  NativeExecuTorchProvider,
  type NativeExecuTorchBridge,
} from '../packages/ai-adapters/src/index';
import { formatLlama32InstructPrompt } from '../packages/ai-contracts/src/index';
import {
  sanitizeTextInput,
  validateBackupSize,
  validateSafeExternalUrl,
} from '../packages/validation/src/index';

describe('Local AI Adapters, ExecuTorch Bridge & Security Validation', () => {
  it('formats Meta Llama 3.2 instruct prompt tags accurately', () => {
    const prompt = formatLlama32InstructPrompt([
      { role: 'system', content: 'Be concise.' },
      { role: 'user', content: 'Explain DAGs.' },
    ]);
    expect(prompt).toContain('<|begin_of_text|>');
    expect(prompt).toContain('<|start_header_id|>system<|end_header_id|>');
    expect(prompt).toContain('<|start_header_id|>user<|end_header_id|>');
    expect(prompt).toContain('<|start_header_id|>assistant<|end_header_id|>');
  });

  it('drives NativeExecuTorchProvider lifecycle: resetContext, generateStream, cancel, dispose', async () => {
    let listener: ((ev: { token: string }) => void) | null = null;
    const bridge: NativeExecuTorchBridge = {
      getCapabilities: vi.fn(async () => ({
        platform: 'android',
        backend: 'xnnpack',
        availableRamMb: 6144,
        isModelInstalled: true,
      })),
      loadModel: vi.fn(async () => {}),
      generate: vi.fn(async () => {
        listener?.({ token: '{"summary":"Master Python first",' });
        listener?.({ token: '"priorityFocus":["python-core"],' });
        listener?.({ token: '"studyAdvice":"Practice daily."}' });
        return {
          text: '{"summary":"Master Python first","priorityFocus":["python-core"],"studyAdvice":"Practice daily."}',
          statsJson: '{"num_generated_tokens":18,"tokens_per_sec":22.5}',
        };
      }),
      stop: vi.fn(async () => {}),
      resetContext: vi.fn(async () => {}),
      dispose: vi.fn(async () => {}),
      addTokenListener: (cb) => {
        listener = cb;
        return { remove: () => { listener = null; } };
      },
    };

    const provider = new NativeExecuTorchProvider('android', bridge);
    await expect(
      provider.generate({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow();

    await provider.initialize({
      modelId: 'llama-3.2-1b-instruct-xnnpack-q4',
      modelPath: '/data/local/llama.pte',
      tokenizerPath: '/data/local/tokenizer.model',
    });
    expect(provider.getModelStatus().state).toBe('ready');

    const service = new LocalAIAdvisoryService(provider);
    const res = await service.explainSkillGap('{"weak":["python-core"]}');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.priorityFocus).toEqual(['python-core']);
      expect(res.stats.decodeTokensPerSec).toBe(22.5);
    }
    expect(bridge.resetContext).toHaveBeenCalledTimes(1);

    await provider.dispose();
    expect(provider.getModelStatus().state).toBe('installed');
  });

  it('enforces security validation rules for URLs, inputs, and backup file sizes', () => {
    expect(validateSafeExternalUrl('https://pytorch.org/executorch/stable/')).toBe(true);
    expect(validateSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(validateSafeExternalUrl('http://insecure.example.com')).toBe(false);

    expect(sanitizeTextInput('hello\u0000world\u0007!')).toBe('helloworld!');
    expect(validateBackupSize(0).valid).toBe(false);
    expect(validateBackupSize(30 * 1024 * 1024).valid).toBe(false);
    expect(validateBackupSize(1024).valid).toBe(true);
  });
});
