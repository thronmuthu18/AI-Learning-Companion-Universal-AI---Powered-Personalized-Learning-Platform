import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { BUNDLED_QUIZZES } from '@alc/resource-management';
import { palette } from '@alc/design-system';
import { Card, MutedText, PrimaryButton, SectionTitle, SecondaryButton } from '../src/components/MobileUI';
import { useMobile } from '../src/state/MobileContext';

export default function QuizModal() {
  const { selectedQuizId, submitQuiz, lastQuizAttempt } = useMobile();
  const quiz = BUNDLED_QUIZZES.find((q) => q.id === selectedQuizId) ?? BUNDLED_QUIZZES[0]!;
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  if (done && lastQuizAttempt) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card>
          <SectionTitle>Quiz Score: {lastQuizAttempt.scorePercent}%</SectionTitle>
          <MutedText>{lastQuizAttempt.correctCount}/{lastQuizAttempt.totalQuestions} correct</MutedText>
          <PrimaryButton title="Back to Library" onPress={() => router.back()} />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>{quiz.title}</SectionTitle>
      </Card>
      {quiz.questions.map((q, idx) => (
        <Card key={q.id}>
          <SectionTitle>Q{idx + 1}. {q.prompt}</SectionTitle>
          {q.options.map((opt, optIdx) =>
            selected[q.id] === optIdx ? (
              <PrimaryButton key={optIdx} title={`✓ ${opt}`} onPress={() => setSelected((p) => ({ ...p, [q.id]: optIdx }))} />
            ) : (
              <SecondaryButton key={optIdx} title={opt} onPress={() => setSelected((p) => ({ ...p, [q.id]: optIdx }))} />
            ),
          )}
        </Card>
      ))}
      <PrimaryButton
        title="Submit Quiz"
        onPress={async () => {
          await submitQuiz(quiz.id, selected);
          setDone(true);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgPrimary },
  content: { padding: 16 },
});
