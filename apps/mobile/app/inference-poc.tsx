import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput } from 'react-native';
import type { ModelDeviceDiagnostics } from '@alc/ai-contracts';
import { palette } from '@alc/design-system';
import { Badge, Card, MutedText, PrimaryButton, SectionTitle, SecondaryButton } from '../src/components/MobileUI';
import { useMobile } from '../src/state/MobileContext';

export default function MobileInferencePocScreen() {
  const {
    provider,
    aiStatus,
    modelFilePath,
    tokenizerFilePath,
    pickAndInstallModelFile,
    initializeNativeLlama,
  } = useMobile();
  const [diag, setDiag] = useState<ModelDeviceDiagnostics | null>(null);
  const [prompt, setPrompt] = useState('Explain binary search complexity in 3 concise bullet points.');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDiag = useCallback(async () => {
    try {
      setDiag(await provider.getDiagnostics());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Diagnostics query failed.');
    }
  }, [provider]);

  useEffect(() => {
    refreshDiag();
  }, [refreshDiag, aiStatus.state]);

  const handleRunTest = async () => {
    setError(null);
    setOutput('');
    setBusy(true);
    try {
      const res = await provider.generateStream(
        {
          messages: [
            { role: 'system', content: 'You are AI Learning Companion running offline via ExecuTorch.' },
            { role: 'user', content: prompt.trim() },
          ],
          maxTokens: 256,
          temperature: 0.4,
        },
        (_tok, acc) => setOutput(acc),
      );
      setOutput(res.text);
      await refreshDiag();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ExecuTorch inference failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Badge label="Phase 04 • ExecuTorch POC & Diagnostics" tone="info" />
        <SectionTitle>Native Llama 3.2 Inference Validation</SectionTitle>
        {diag && (
          <>
            <MutedText>Platform / Runtime: {diag.platform} ({diag.runtime})</MutedText>
            <MutedText>Backend: {diag.cpuBackend} • Compatible: {diag.compatible ? 'Yes' : 'No'}</MutedText>
            <MutedText>
              RAM: {diag.availableMemoryMb ?? '-'} MB free / {diag.totalDeviceRamMb ?? '-'} MB total
            </MutedText>
            <MutedText>
              Load Time: {diag.loadTimeMs !== null ? `${diag.loadTimeMs} ms` : 'Not loaded'} • Offline Ready:{' '}
              {diag.offlineCached ? 'Yes' : 'No'}
            </MutedText>
            <MutedText>
              Last Inference: {diag.lastInferenceStats ? `${diag.lastInferenceStats.totalTimeMs} ms (${diag.lastInferenceStats.decodeTokensPerSec ?? '-'} tok/s)` : 'Not measured'}
            </MutedText>
          </>
        )}
        <SecondaryButton title="Refresh Device Diagnostics" onPress={refreshDiag} />
      </Card>

      <Card>
        <SectionTitle>Model Artifacts (.pte & tokenizer.model)</SectionTitle>
        <MutedText>Model: {modelFilePath ?? 'Not selected'}</MutedText>
        <MutedText>Tokenizer: {tokenizerFilePath ?? 'Not selected'}</MutedText>
        <MutedText>State: {aiStatus.state} — {aiStatus.statusMessage}</MutedText>
        <SecondaryButton title="Select & Verify .pte Model (SHA-256)" onPress={() => pickAndInstallModelFile('pte')} />
        <SecondaryButton title="Select & Verify tokenizer.model (SHA-256)" onPress={() => pickAndInstallModelFile('tokenizer')} />
        <PrimaryButton
          title="Load Model into ExecuTorch"
          onPress={async () => {
            setError(null);
            try {
              await initializeNativeLlama();
              await refreshDiag();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Model load failed.');
            }
          }}
        />
        <SecondaryButton title="Unload Model" onPress={() => provider.unloadModel().then(refreshDiag)} />
      </Card>

      <Card>
        <SectionTitle>Smoke Prompt Execution</SectionTitle>
        <TextInput
          style={styles.input}
          value={prompt}
          onChangeText={setPrompt}
          multiline
          placeholderTextColor={palette.textMuted}
        />
        {busy ? (
          <SecondaryButton title="Cancel Generation" onPress={() => provider.cancel()} />
        ) : (
          <PrimaryButton title="Run ExecuTorch Inference" onPress={handleRunTest} />
        )}
        {error && <Badge label={error} tone="danger" />}
        {output ? <MutedText>{output}</MutedText> : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgPrimary },
  content: { padding: 16 },
  input: {
    backgroundColor: palette.bgInput,
    borderColor: palette.borderSubtle,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: palette.textPrimary,
    minHeight: 72,
  },
});
