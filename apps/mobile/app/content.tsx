import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { palette } from '@alc/design-system';
import { Badge, Card, MutedText, SectionTitle } from '../src/components/MobileUI';
import { useMobile } from '../src/state/MobileContext';

export default function ContentModal() {
  const { allResources, selectedResourceId } = useMobile();
  const resource = allResources.find((r) => r.id === selectedResourceId) ?? allResources[0];

  if (!resource) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Badge label={`${resource.origin} • ${resource.estimatedMinutes} min`} tone="info" />
        <SectionTitle>{resource.title}</SectionTitle>
        <MutedText>{resource.contentMarkdown}</MutedText>
      </Card>
      {resource.codeExample && (
        <Card>
          <SectionTitle>Code Example</SectionTitle>
          <MutedText>{resource.codeExample}</MutedText>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgPrimary },
  content: { padding: 16 },
});
