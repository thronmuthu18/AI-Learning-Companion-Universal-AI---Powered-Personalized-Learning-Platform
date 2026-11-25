import type { ModelLoadState, PlatformKind } from '@alc/shared-types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICapabilities {
  platform: PlatformKind;
  runtime: 'webllm' | 'executorch-android' | 'executorch-ios';
  backend: 'webgpu' | 'xnnpack' | 'coreml' | 'mps' | 'unsupported';
  hardwareAccelerated: boolean;
  supportsStreaming: boolean;
  supportsShaderF16?: boolean;
  gpuAdapterInfo?: string;
  maxContextTokens: number;
  estimatedRamMb: number;
  availableMemoryMb?: number | null;
  supportedAbis?: string[];
  executorchLinked?: boolean;
  reasonIfUnsupported?: string;
}

export interface InferenceStats {
  prefillTimeMs: number | null;
  decodeTokensPerSec: number | null;
  generatedTokens: number | null;
  totalTimeMs: number;
}

export interface ModelStatusSnapshot {
  modelId: string;
  state: ModelLoadState;
  progressPercent: number;
  statusMessage: string;
  errorMessage: string | null;
  loadTimeMs: number | null;
  offlineReady: boolean;
  lastStats: InferenceStats | null;
}

export interface ModelDeviceDiagnostics {
  platform: PlatformKind;
  runtime: AICapabilities['runtime'];
  modelId: string;
  compatible: boolean;
  compatibilityReason: string;
  cpuBackend: string;
  gpuBackend: string;
  webgpuAvailable: boolean;
  supportsShaderF16: boolean;
  totalDeviceRamMb: number | null;
  availableMemoryMb: number | null;
  requiredStorageMb: number;
  availableStorageMb: number | null;
  offlineCached: boolean;
  loadTimeMs: number | null;
  lastInferenceStats: InferenceStats | null;
  state: ModelLoadState;
}

export interface AIGenerateRequest {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export interface AIGenerateResponse {
  text: string;
  stats: InferenceStats;
  modelId: string;
}

export interface AIInitConfig {
  modelId: string;
  modelPath?: string;
  tokenizerPath?: string;
  temperature?: number;
  contextLength?: number;
}

export type AIProgressCallback = (progress: {
  progressPercent: number;
  text: string;
}) => void;

export type AITokenCallback = (token: string, accumulatedText: string) => void;

export interface LocalAIProvider {
  initialize(config?: AIInitConfig, onProgress?: AIProgressCallback): Promise<void>;
  loadModel(config: AIInitConfig, onProgress?: AIProgressCallback): Promise<void>;
  getCapabilities(): Promise<AICapabilities>;
  getDiagnostics(): Promise<ModelDeviceDiagnostics>;
  generate(request: AIGenerateRequest): Promise<AIGenerateResponse>;
  generateStream(request: AIGenerateRequest, onToken: AITokenCallback): Promise<AIGenerateResponse>;
  cancel(): Promise<void>;
  unloadModel(): Promise<void>;
  dispose(): Promise<void>;
  getModelStatus(): ModelStatusSnapshot;
}

/**
 * Formats chat messages into the official Meta Llama 3.2 Instruct prompt template
 * used by ExecuTorch LlmModule / TextLLMRunner on Android & iOS.
 */
export function formatLlama32InstructPrompt(messages: ChatMessage[]): string {
  const parts: string[] = ['<|begin_of_text|>'];
  for (const msg of messages) {
    parts.push(`<|start_header_id|>${msg.role}<|end_header_id|>\n\n${msg.content}<|eot_id|>`);
  }
  parts.push('<|start_header_id|>assistant<|end_header_id|>\n\n');
  return parts.join('');
}

export function buildGoalInterpretationMessages(rawGoalText: string, availableSlugs: string[]): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You are the AI Learning Companion universal curriculum analyst supporting all domains (engineering, sciences, business/accounting, competitive exams, arts, languages, vocational, software, AI). Return ONLY strict valid JSON matching keys: normalizedTitle (string), suggestedCategory (concise snake_case slug for the true domain/goal, never default to CS unless relevant), domainName (string), subjectName (string), expectedProficiency (beginner|intermediate|advanced), learningPurpose (academic|professional|examination|personal), currentKnowledgeAssumptions (string[]), structuredObjectives (array of 3-5 concise strings), recommendedSkillSlugs (array chosen ONLY from provided slugs that match; empty array ONLY avoided when matching slugs exist), missingInformation (string[]), rationale (string). No markdown fences.',
    },
    {
      role: 'user',
      content: `Learner goal text: "${rawGoalText}"\nCatalog skill slugs: ${availableSlugs.join(', ')}`,
    },
  ];
}

export function buildSkillGapExplanationMessages(summaryPayload: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You are a local educational advisor. Given verified assessment evidence and skill gaps, respond ONLY with valid JSON: {"summary": string, "priorityFocus": string[], "studyAdvice": string}. No markdown fences.',
    },
    {
      role: 'user',
      content: summaryPayload,
    },
  ];
}

export function buildRoadmapAdvisoryMessages(roadmapPayload: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You are a local learning roadmap advisor. Respond ONLY with valid JSON: {"executiveSummary": string, "milestoneTips": string[], "projectIdeas": string[]}. No markdown fences.',
    },
    {
      role: 'user',
      content: roadmapPayload,
    },
  ];
}

export function buildTutorMessages(params: {
  learnerContext: string;
  question: string;
}): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You are AI Learning Companion, an offline local Llama 3.2 educational tutor. Give accurate, structured, concise pedagogical explanations with step-by-step reasoning and an actionable practice task. Never fabricate external URLs.',
    },
    {
      role: 'user',
      content: `Learner Context:\n${params.learnerContext}\n\nQuestion:\n${params.question}`,
    },
  ];
}
