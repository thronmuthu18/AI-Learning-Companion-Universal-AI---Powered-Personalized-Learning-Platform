import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import type { SubmittedQuestionResponse } from '@alc/assessment-engine';
import { palette } from '@alc/design-system';
import { Badge, Card, MutedText, PrimaryButton, SectionTitle, SecondaryButton } from '../src/components/MobileUI';
import { useMobile } from '../src/state/MobileContext';

interface MobileDraftAnswer {
  selectedOptionIndex: number;
  selectedOptionIndices: number[];
  numericInput: string;
  unitInput: string;
  textInput: string;
  confidenceRating: number;
}

export default function AssessmentModal() {
  const {
    activeDiagnosticAssessment,
    activeDiagnosticQuestions,
    assessmentHistorySummary,
    submitDiagnostic,
    lastAssessmentResult,
  } = useMobile();

  const [startedAt] = useState(() => new Date().toISOString());
  const [answers, setAnswers] = useState<Record<string, MobileDraftAnswer>>({});
  const [revealedFlashcards, setRevealedFlashcards] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const patch = (qId: string, partial: Partial<MobileDraftAnswer>) => {
    setAnswers((prev) => {
      const base: MobileDraftAnswer = prev[qId] ?? {
        selectedOptionIndex: -1,
        selectedOptionIndices: [],
        numericInput: '',
        unitInput: '',
        textInput: '',
        confidenceRating: 3,
      };
      return { ...prev, [qId]: { ...base, ...partial } };
    });
  };

  const handleSubmit = async () => {
    const responses: SubmittedQuestionResponse[] = activeDiagnosticQuestions.map((q) => {
      const a = answers[q.id];
      const numVal =
        a && a.numericInput.trim() !== '' && Number.isFinite(Number(a.numericInput))
          ? Number(a.numericInput)
          : null;
      return {
        questionId: q.id,
        selectedOptionIndex: a?.selectedOptionIndex ?? -1,
        selectedOptionIndices: a?.selectedOptionIndices ?? [],
        numericAnswer: numVal,
        unitAnswer: a?.unitInput.trim() || null,
        textAnswer: a?.textInput.trim() || null,
        confidenceRating: a?.confidenceRating ?? 3,
        timeSpentSeconds: 25,
      };
    });
    await submitDiagnostic(responses, startedAt, activeDiagnosticAssessment, activeDiagnosticQuestions);
    setSubmitted(true);
  };

  if (submitted && lastAssessmentResult) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card>
          <Badge label={`Evaluated: ${lastAssessmentResult.attempt.evaluationMethod ?? 'deterministic'}`} tone="success" />
          <SectionTitle>Assessment Completed</SectionTitle>
          <MutedText>
            Verified Score: {lastAssessmentResult.attempt.scorePercent}% ({lastAssessmentResult.attempt.correctCount}/{lastAssessmentResult.attempt.totalQuestions})
          </MutedText>
          <MutedText>
            Next Adaptive Difficulty: {lastAssessmentResult.adaptiveDecision.recommendedNextDifficulty.toUpperCase()}
          </MutedText>
          {lastAssessmentResult.adaptiveDecision.reasons.map((r, i) => (
            <MutedText key={i}>• {r}</MutedText>
          ))}
          <PrimaryButton title="View Updated Roadmap & Skill Gaps" onPress={() => router.replace('/(tabs)/roadmap')} />
        </Card>

        {assessmentHistorySummary.totalAttempts > 0 && (
          <Card>
            <SectionTitle>Attempt History ({assessmentHistorySummary.totalAttempts})</SectionTitle>
            <MutedText>
              Best: {assessmentHistorySummary.bestScorePercent}% • Avg: {assessmentHistorySummary.averageScorePercent}%
            </MutedText>
          </Card>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Badge label={activeDiagnosticAssessment.title} tone="info" />
        <SectionTitle>Universal Diagnostic Assessment</SectionTitle>
        <MutedText>
          {activeDiagnosticQuestions.length} domain-scoped question(s) • Prior Attempts: {assessmentHistorySummary.totalAttempts}
        </MutedText>
      </Card>

      {activeDiagnosticQuestions.map((q, idx) => {
        const a = answers[q.id] ?? {
          selectedOptionIndex: -1,
          selectedOptionIndices: [],
          numericInput: '',
          unitInput: '',
          textInput: '',
          confidenceRating: 3,
        };
        const qType = q.questionType ?? 'mcq';

        return (
          <Card key={q.id}>
            <Badge label={`${qType.replace('_', ' ').toUpperCase()} • ${q.difficulty.toUpperCase()}`} tone="info" />
            <SectionTitle>Q{idx + 1}. {q.prompt}</SectionTitle>

            {(qType === 'mcq' || qType === 'conceptual' || qType === 'scenario') &&
              q.options.map((opt, optIdx) =>
                a.selectedOptionIndex === optIdx ? (
                  <PrimaryButton key={optIdx} title={`✓ ${opt}`} onPress={() => patch(q.id, { selectedOptionIndex: optIdx })} />
                ) : (
                  <SecondaryButton key={optIdx} title={opt} onPress={() => patch(q.id, { selectedOptionIndex: optIdx })} />
                ),
              )}

            {qType === 'multiple_select' &&
              q.options.map((opt, optIdx) => {
                const chosen = a.selectedOptionIndices.includes(optIdx);
                return (
                  <SecondaryButton
                    key={optIdx}
                    title={`${chosen ? '[✓] ' : '[ ] '}${opt}`}
                    onPress={() => {
                      const next = chosen
                        ? a.selectedOptionIndices.filter((x) => x !== optIdx)
                        : [...a.selectedOptionIndices, optIdx];
                      patch(q.id, { selectedOptionIndices: next });
                    }}
                  />
                );
              })}

            {qType === 'numerical' && (
              <View>
                <TextInput
                  style={styles.input}
                  value={a.numericInput}
                  onChangeText={(val) => patch(q.id, { numericInput: val })}
                  keyboardType="numeric"
                  placeholder="Enter numeric value"
                  placeholderTextColor={palette.textMuted}
                />
                {q.expectedUnit && (
                  <TextInput
                    style={styles.input}
                    value={a.unitInput}
                    onChangeText={(val) => patch(q.id, { unitInput: val })}
                    placeholder={`Unit (e.g., ${q.expectedUnit})`}
                    placeholderTextColor={palette.textMuted}
                  />
                )}
              </View>
            )}

            {(qType === 'descriptive' || qType === 'short_answer' || qType === 'case_study' || qType === 'practical' || qType === 'coding') && (
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                multiline
                value={a.textInput}
                onChangeText={(val) => patch(q.id, { textInput: val })}
                placeholder={qType === 'coding' ? 'Enter solution code...' : 'Enter structured explanation...'}
                placeholderTextColor={palette.textMuted}
              />
            )}

            {qType === 'flashcard' && (
              <View>
                <SecondaryButton
                  title={revealedFlashcards[q.id] ? 'Hide Answer' : 'Reveal Reference Answer'}
                  onPress={() => setRevealedFlashcards((p) => ({ ...p, [q.id]: !p[q.id] }))}
                />
                {revealedFlashcards[q.id] && q.referenceAnswer && (
                  <MutedText>{q.referenceAnswer}</MutedText>
                )}
                {q.options.map((opt, optIdx) => (
                  <SecondaryButton
                    key={optIdx}
                    title={`${a.selectedOptionIndex === optIdx ? '✓ ' : ''}${opt}`}
                    onPress={() => patch(q.id, { selectedOptionIndex: optIdx })}
                  />
                ))}
              </View>
            )}

            <MutedText>Confidence Rating (1–5): {a.confidenceRating}</MutedText>
            <View style={styles.confRow}>
              {[1, 2, 3, 4, 5].map((c) => (
                <SecondaryButton
                  key={c}
                  title={a.confidenceRating === c ? `[${c}]` : String(c)}
                  onPress={() => patch(q.id, { confidenceRating: c })}
                />
              ))}
            </View>
          </Card>
        );
      })}

      <PrimaryButton title="Submit Universal Assessment" onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgPrimary },
  content: { padding: 16 },
  confRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  input: {
    backgroundColor: palette.bgInput,
    borderColor: palette.borderSubtle,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: palette.textPrimary,
    marginBottom: 10,
    marginTop: 6,
  },
});
