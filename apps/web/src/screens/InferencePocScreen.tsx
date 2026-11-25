import React, { useCallback, useEffect, useState } from 'react';
import type { ModelDeviceDiagnostics } from '@alc/ai-contracts';
import { Activity, Cpu, HardDrive, Play, RefreshCw, Square, Trash2, WifiOff } from 'lucide-react';
import { WEB_DEFAULT_MODEL_F16, WEB_FALLBACK_MODEL_F32 } from '../ai/web-webllm-provider';
import { useApp } from '../state/AppContext';

export const InferencePocScreen: React.FC = () => {
  const { provider, aiStatus, isOnline, initializeLocalModel, unloadLocalModel } = useApp();
  const [selectedModel, setSelectedModel] = useState(WEB_DEFAULT_MODEL_F16);
  const [diagnostics, setDiagnostics] = useState<ModelDeviceDiagnostics | null>(null);
  const [prompt, setPrompt] = useState(
    'Explain directed acyclic graphs in 3 concise bullet points for a computer science student.',
  );
  const [temperature, setTemperature] = useState(0.4);
  const [maxTokens, setMaxTokens] = useState(256);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDiagnostics = useCallback(async () => {
    const diag = await provider.getDiagnostics();
    setDiagnostics(diag);
  }, [provider]);

  useEffect(() => {
    refreshDiagnostics();
  }, [refreshDiagnostics, aiStatus.state]);

  const handleLoad = async () => {
    setError(null);
    try {
      await initializeLocalModel(selectedModel);
      await refreshDiagnostics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load WebLLM model.');
      await refreshDiagnostics();
    }
  };

  const handleUnload = async () => {
    setError(null);
    await unloadLocalModel();
    await refreshDiagnostics();
  };

  const handleRunSmokeTest = async () => {
    setError(null);
    setOutput('');
    setRunning(true);
    try {
      const res = await provider.generateStream(
        {
          messages: [
            {
              role: 'system',
              content: 'You are AI Learning Companion running locally via WebLLM. Be accurate and concise.',
            },
            { role: 'user', content: prompt.trim() },
          ],
          temperature,
          maxTokens,
        },
        (_tok, acc) => setOutput(acc),
      );
      setOutput(res.text);
      await refreshDiagnostics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Local WebGPU inference failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span className="badge badge-info">Phase 04 • WebLLM + WebGPU Proof of Concept</span>
            <h2 style={{ margin: '8px 0 4px' }}>Local Llama 3.2 Inference & Diagnostics Lab</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Executes genuine browser-side WebGPU inference via <code>@mlc-ai/web-llm</code> worker. No remote fallback.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={refreshDiagnostics}>
            <RefreshCw size={15} /> Refresh Diagnostics
          </button>
        </div>
      </div>

      {diagnostics && (
        <div className="card-grid">
          <div className="card">
            <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
              <Cpu size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              WebGPU & Hardware
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>
              {diagnostics.webgpuAvailable ? 'WebGPU Ready' : 'Unsupported'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              {diagnostics.gpuBackend} • shader-f16: {diagnostics.supportsShaderF16 ? 'Yes' : 'No'}
            </div>
          </div>

          <div className="card">
            <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
              <HardDrive size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Memory & Storage
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>
              Req: {diagnostics.requiredStorageMb} MB
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              Device RAM: {diagnostics.totalDeviceRamMb ? `${diagnostics.totalDeviceRamMb} MB` : 'Browser hidden'} • Free Quota:{' '}
              {diagnostics.availableStorageMb !== null ? `${diagnostics.availableStorageMb} MB` : 'Unknown'}
            </div>
          </div>

          <div className="card">
            <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
              <WifiOff size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Offline Cache & Load Time
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: diagnostics.offlineCached ? '#10B981' : '#F59E0B' }}>
              {diagnostics.offlineCached ? 'Cached Offline' : 'Not Cached'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              Network: {isOnline ? 'Online' : 'Offline'} • Load Time:{' '}
              {diagnostics.loadTimeMs !== null ? `${diagnostics.loadTimeMs} ms` : 'Not loaded'}
            </div>
          </div>

          <div className="card">
            <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
              <Activity size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Last Measured Inference
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: '#06B6D4' }}>
              {diagnostics.lastInferenceStats?.decodeTokensPerSec
                ? `${diagnostics.lastInferenceStats.decodeTokensPerSec} tok/s`
                : 'Not measured'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              Tokens: {diagnostics.lastInferenceStats?.generatedTokens ?? '-'} • Duration:{' '}
              {diagnostics.lastInferenceStats ? `${diagnostics.lastInferenceStats.totalTimeMs} ms` : '-'}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>1. Model Initialization & Lifecycle</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <select
            className="select"
            style={{ maxWidth: 360 }}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            <option value={WEB_DEFAULT_MODEL_F16}>Llama-3.2-1B-Instruct-q4f16_1-MLC (879 MB)</option>
            <option value={WEB_FALLBACK_MODEL_F32}>Llama-3.2-1B-Instruct-q4f32_1-MLC (1120 MB fallback)</option>
          </select>
          <button className="btn btn-primary" onClick={handleLoad} disabled={running}>
            Load Model into WebGPU
          </button>
          <button className="btn btn-secondary" onClick={handleUnload} disabled={running}>
            <Trash2 size={15} /> Unload Model
          </button>
        </div>

        <p style={{ margin: '6px 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
          State: <strong>{aiStatus.state}</strong> ({aiStatus.progressPercent}%) — {aiStatus.statusMessage}
        </p>

        {(aiStatus.state === 'downloading' || aiStatus.state === 'loading') && (
          <div className="progress-track" style={{ marginTop: 8 }}>
            <div className="progress-fill" style={{ width: `${aiStatus.progressPercent}%` }} />
          </div>
        )}

        {(error || aiStatus.errorMessage) && (
          <div className="badge badge-danger" style={{ width: '100%', padding: 12, borderRadius: 10, marginTop: 12 }}>
            {error ?? aiStatus.errorMessage}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>2. Real Local Prompt Execution & Streaming Verification</h3>
        <div className="card-grid" style={{ marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, marginBottom: 4 }}>Temperature</label>
            <input
              className="input"
              type="number"
              step="0.1"
              min="0"
              max="1.5"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, marginBottom: 4 }}>Max New Tokens</label>
            <input
              className="input"
              type="number"
              min="32"
              max="1024"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
            />
          </div>
        </div>

        <textarea
          className="textarea"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {running ? (
            <button className="btn btn-danger" onClick={() => provider.cancel()}>
              <Square size={15} /> Cancel Generation
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleRunSmokeTest}>
              <Play size={15} /> Run Local Llama Smoke Test
            </button>
          )}
        </div>

        {output && (
          <pre className="code-block" style={{ marginTop: 16, fontFamily: 'inherit' }}>
            {output}
          </pre>
        )}
      </div>
    </div>
  );
};
