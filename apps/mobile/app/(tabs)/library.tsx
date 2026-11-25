import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { BUNDLED_QUIZZES } from '@alc/resource-management';
import { palette } from '@alc/design-system';
import { Badge, Card, MutedText, PrimaryButton, SectionTitle, SecondaryButton } from '../../src/components/MobileUI';
import { useMobile } from '../../src/state/MobileContext';

export default function LibraryTab() {
  const { allResources, setSelectedResourceId, setSelectedQuizId } = useMobile();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>Offline Learning Library</SectionTitle>
        {allResources.map((r) => (
          <Card key={r.id} style={{ backgroundColor: palette.bgSecondary }}>
            <Badge label={r.origin} tone={r.origin === 'optional_external' ? 'warning' : 'success'} />
            <SectionTitle>{r.title}</SectionTitle>
            <MutedText>{r.summary}</MutedText>
            <PrimaryButton
              title="Open Lesson"
              onPress={() => {
                setSelectedResourceId(r.id);
                router.push('/content');
              }}
            />
          </Card>
        ))}
      </Card>

      <Card>
        <SectionTitle>Topic Mastery Quizzes</SectionTitle>
        {BUNDLED_QUIZZES.map((q) => (
          <SecondaryButton
            key={q.id}
            title={`${q.title} (${q.difficulty})`}
            onPress={() => {
              setSelectedQuizId(q.id);
              router.push('/quiz');
            }}
          />
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgPrimary },
  content: { padding: 16 },
});
