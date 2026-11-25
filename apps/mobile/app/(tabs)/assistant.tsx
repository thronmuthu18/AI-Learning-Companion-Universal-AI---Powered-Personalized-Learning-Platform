import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';
import { palette } from '@alc/design-system';
import { Badge, Card, MutedText, PrimaryButton, SectionTitle, SecondaryButton } from '../../src/components/MobileUI';
import { useMobile } from '../../src/state/MobileContext';

export default function AssistantTab() {
  const { aiStatus, advisoryService, provider, activeGoal, skillGap } = useMobile();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [busy, setBusy] = useState(false);

  const handleAsk = async () => {
    const clean = question.trim();
    if (!clean || busy) return;

    if (aiStatus.state !== 'ready') {
      setMessages((prev) => [
        ...prev,
        { role: 'User', text: clean },
        {
          role: 'System',
          text: 'ExecuTorch Llama 3.2 .pte model is not loaded. Go to Settings to pick and load your local .pte and tokenizer.model files.',
        },
      ]);
      setQuestion('');
      return;
    }

    setBusy(true);
    setMessages((prev) => [...prev, { role: 'User', text: clean }, { role: 'Llama 3.2', text: '' }]);
    setQuestion('');

    const ctx = `Goal: ${activeGoal?.title ?? 'None'}\nWeak: ${skillGap.weakSkills.map((s) => s.name).join(', ')}`;
    try {
      const res = await advisoryService.askTutorStream(ctx, clean, (_tok, acc) => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'Llama 3.2', text: acc };
          return copy;
        });
      });
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: 'Llama 3.2',
          text: `${res.text}\n[${res.stats.totalTimeMs}ms • ${res.stats.decodeTokensPerSec ?? '-'} tok/s]`,
        };
        return copy;
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'Error', text: err instanceof Error ? err.message : 'ExecuTorch inference failed.' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Badge label={`ExecuTorch State: ${aiStatus.state}`} tone={aiStatus.state === 'ready' ? 'success' : 'info'} />
        <SectionTitle>Local Llama 3.2 Assistant</SectionTitle>
        <MutedText>{aiStatus.statusMessage}</MutedText>
        {aiStatus.state !== 'ready' && (
          <SecondaryButton title="Configure ExecuTorch Model" onPress={() => router.push('/(tabs)/settings')} />
        )}
      </Card>

      {messages.map((m, i) => (
        <Card key={i}>
          <SectionTitle>{m.role}</SectionTitle>
          <MutedText>{m.text}</MutedText>
        </Card>
      ))}

      <Card>
        <TextInput
          style={styles.input}
          placeholder="Ask your offline ExecuTorch Llama tutor..."
          placeholderTextColor={palette.textMuted}
          value={question}
          onChangeText={setQuestion}
          multiline
        />
        {busy ? (
          <SecondaryButton title="Stop Generation" onPress={() => provider.cancel()} />
        ) : (
          <PrimaryButton title="Send Prompt to ExecuTorch" onPress={handleAsk} />
        )}
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
    padding: 12,
    color: palette.textPrimary,
    minHeight: 72,
  },
});
