import { NativeModule, requireNativeModule } from 'expo-modules-core';
import type { NativeExecuTorchBridge } from '@alc/ai-adapters';

type ExecuTorchEvents = {
  onToken(event: { token: string }): void;
  onModelError(event: { code: number; message: string }): void;
};

declare class ExecuTorchNativeModule extends NativeModule<ExecuTorchEvents> {
  getCapabilities(): Promise<{
    platform: 'android' | 'ios';
    backend: 'xnnpack' | 'coreml' | 'mps';
    availableRamMb: number;
    totalRamMb?: number;
    supportedAbis?: string[];
    executorchLinked?: boolean;
    isModelInstalled: boolean;
  }>;
  verifyFileSha256(filePath: string): Promise<string>;
  loadModel(modelPath: string, tokenizerPath: string, temperature: number): Promise<void>;
  generate(
    prompt: string,
    seqLen: number,
    temperature: number,
  ): Promise<{ text: string; statsJson: string }>;
  stop(): Promise<void>;
  resetContext(): Promise<void>;
  dispose(): Promise<void>;
}

const NativeExecuTorch = requireNativeModule<ExecuTorchNativeModule>('ExecuTorchLlama');

export const execuTorchBridge: NativeExecuTorchBridge & {
  verifyFileSha256(filePath: string): Promise<string>;
} = {
  getCapabilities: () => NativeExecuTorch.getCapabilities(),
  verifyFileSha256: (filePath: string) => NativeExecuTorch.verifyFileSha256(filePath),
  loadModel: (modelPath: string, tokenizerPath: string, temperature: number) =>
    NativeExecuTorch.loadModel(modelPath, tokenizerPath, temperature),
  generate: (prompt: string, seqLen: number, temperature: number) =>
    NativeExecuTorch.generate(prompt, seqLen, temperature),
  stop: () => NativeExecuTorch.stop(),
  resetContext: () => NativeExecuTorch.resetContext(),
  dispose: () => NativeExecuTorch.dispose(),
  addTokenListener: (cb: (event: { token: string }) => void) =>
    NativeExecuTorch.addListener('onToken', cb),
};
