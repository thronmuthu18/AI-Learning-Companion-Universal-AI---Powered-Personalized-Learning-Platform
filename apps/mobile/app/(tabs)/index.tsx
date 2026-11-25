import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { palette } from '@alc/design-system';
import { Badge, Card, MutedText, PrimaryButton, SectionTitle, SecondaryButton } from '../../src/components/MobileUI';
import { useMobile } from '../../src/state/MobileContext';

export default function DashboardTab() {
  const { ready, snapshot, activeGoal, metrics, aiStatus } = useMobile();

  if (!ready) {
    return (
      <View style={styles.center}>
        <Text style={{ color: palette.textPrimary, fontSize: 18 }}>Initializing local SQLite & ExecuTorch...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Badge label="Built with Llama 3.2 • Offline-First" tone="info" />
        <SectionTitle>
          {snapshot.learner ? `Welcome, ${snapshot.learner.displayName}` : 'AI Learning Companion'}
        </SectionTitle>
        <MutedText>
          Active Goal: {activeGoal?.title ?? 'No active goal selected yet'}
        </MutedText>
        <MutedText>
          Local Llama Runtime: {aiStatus.state.toUpperCase()} ({aiStatus.statusMessage})
        </MutedText>
        <PrimaryButton
          title={snapshot.learner ? 'Edit Learner Profile' : 'Start Learner Onboarding'}
          onPress={() => router.push('/onboarding')}
        />
        <SecondaryButton
          title="Take Diagnostic Skill Assessment"
          onPress={() => router.push('/assessment')}
        />
      </Card>

      <Card>
        <SectionTitle>Verified Progress Metrics</SectionTitle>
        {metrics.evidenceStatus === 'insufficient' && (
          <Badge label="Insufficient assessment evidence — study time alone does not grant mastery" tone="warning" />
        )}
        <MutedText>Roadmap Completion: {metrics.roadmapCompletionPercent}% ({metrics.completedTopicsCount} done, {metrics.pendingTopicsCount} pending)</MutedText>
        <MutedText>
          Demonstrated Mastery: {metrics.overallDemonstratedMasteryPercent !== null ? `${metrics.overallDemonstratedMasteryPercent}%` : 'Insufficient Evidence'} (Confidence Avg: {metrics.averageSelfReportedConfidencePercent !== null ? `${metrics.averageSelfReportedConfidencePercent}%` : 'N/A'})
        </MutedText>
        <MutedText>Study Hours: {metrics.totalStudyHours}h • Consistency (14d): {metrics.consistencyScorePercent}% • Streak: {metrics.currentStreakDays}d</MutedText>
        <MutedText>
          Time Accuracy: {metrics.studyTimeAccuracyPercent !== null ? `${metrics.studyTimeAccuracyPercent}%` : 'No logs'} • Assessment Trend: {metrics.assessmentTrend}
        </MutedText>
      </Card>

      <Card>
        <SectionTitle>Domain & Goal Progress</SectionTitle>
        {metrics.domainProgress.length === 0 ? (
          <MutedText>Activate a goal to see domain-wise and goal-wise analytics.</MutedText>
        ) : (
          metrics.domainProgress.map((dom) => (
            <MutedText key={dom.domainId}>
              • {dom.domainName}: {dom.completionPercent}% done • Mastery: {dom.demonstratedMasteryPercent !== null ? `${dom.demonstratedMasteryPercent}%` : 'Insufficient'} ({dom.studyHoursLogged}h)
            </MutedText>
          ))
        )}
        {metrics.goalProgress.map((gp) => (
          <MutedText key={gp.goalId}>
            Goal [{gp.priority}]: {gp.title} — {gp.completedMilestones}/{gp.totalMilestones} milestones
          </MutedText>
        ))}
      </Card>

      <Card>
        <SectionTitle>Skill Mastery & Retention Estimates</SectionTitle>
        <MutedText>Strong: {metrics.strongSkillsCount} • Weak: {metrics.weakSkillsCount} • Missing: {metrics.missingSkillsCount} • Unassessed: {metrics.unassessedSkillsCount}</MutedText>
        {metrics.retentionIndicators.slice(0, 3).map((ret) => (
          <MutedText key={ret.skillId}>
            • {ret.skillName}: {ret.retentionRisk} risk ({ret.explanation})
          </MutedText>
        ))}
        <SecondaryButton title="Inspect Roadmap & Skill Gaps" onPress={() => router.push('/(tabs)/roadmap')} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgPrimary },
  content: { padding: 16 },
  center: { flex: 1, backgroundColor: palette.bgPrimary, justifyContent: 'center', alignItems: 'center' },
});
