import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { StudyTechnique } from '@alc/shared-types';
import {
  canTransitionSessionStatus,
  getDailySessions,
  getMonthlyTargets,
  getWeeklyBuckets,
  type ScheduleRevisionPreview,
} from '@alc/study-planner';
import { palette } from '@alc/design-system';
import { Badge, Card, MutedText, PrimaryButton, SectionTitle, SecondaryButton } from '../../src/components/MobileUI';
import { useMobile } from '../../src/state/MobileContext';

export default function PlannerTab() {
  const {
    activeSchedule,
    snapshot,
    adaptivePlanPreview,
    updateStudySessionLifecycle,
    recalculateMissed,
    previewMissedAndPostponedReschedule,
    applyScheduleOptions,
    refreshAdaptive,
    respondToRecommendation,
    confirmAndApplyAdaptiveAdjustments,
  } = useMobile();
  const [showAdaptivePreview, setShowAdaptivePreview] = useState(false);
  const todayISO = new Date().toISOString().slice(0, 10);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [technique, setTechnique] = useState<StudyTechnique>(
    () => activeSchedule?.studyTechnique ?? 'spaced_blocks',
  );
  const [includeBreaks, setIncludeBreaks] = useState(() => Boolean(activeSchedule?.breakConfig));
  const [previewInfo, setPreviewInfo] = useState<ScheduleRevisionPreview | null>(null);

  const daily = activeSchedule ? getDailySessions(activeSchedule.sessions, todayISO) : [];
  const weekly = activeSchedule ? getWeeklyBuckets(activeSchedule.sessions).slice(0, 3) : [];
  const monthly = activeSchedule ? getMonthlyTargets(activeSchedule.sessions).slice(0, 2) : [];

  const handlePreview = () => {
    const res = previewMissedAndPostponedReschedule();
    setPreviewInfo(res ? res.preview : null);
  };

  const handleConfirmReschedule = async () => {
    await recalculateMissed();
    setPreviewInfo(null);
  };

  const handleApplyTechnique = async (nextTech: StudyTechnique, nextBreaks: boolean) => {
    setTechnique(nextTech);
    setIncludeBreaks(nextBreaks);
    await applyScheduleOptions({ studyTechnique: nextTech, includeBreaks: nextBreaks });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>Today's Study Plan ({todayISO})</SectionTitle>
        {activeSchedule?.schedulingSummary && <MutedText>{activeSchedule.schedulingSummary}</MutedText>}
        {activeSchedule && !activeSchedule.isRealistic && activeSchedule.feasibilityWarning && (
          <Badge label={activeSchedule.feasibilityWarning} tone="warning" />
        )}
        <View style={styles.rowWrap}>
          {(['spaced_blocks', 'pomodoro', 'deep_focus'] as StudyTechnique[]).map((tech) => (
            <SecondaryButton
              key={tech}
              title={technique === tech ? `✓ ${tech}` : tech}
              onPress={() => handleApplyTechnique(tech, includeBreaks)}
            />
          ))}
          <SecondaryButton
            title={includeBreaks ? 'Breaks: ON' : 'Breaks: OFF'}
            onPress={() => handleApplyTechnique(technique, !includeBreaks)}
          />
        </View>

        {daily.length === 0 ? (
          <MutedText>No sessions scheduled for {todayISO}. Select a goal in Roadmap to generate a plan.</MutedText>
        ) : (
          daily.map((s) => {
            const isBreak = s.sessionType === 'break';
            return (
              <Card key={s.id} style={{ backgroundColor: palette.bgSecondary }}>
                <Badge label={`${s.sessionType} • ${s.status}`} tone={s.status === 'completed' ? 'success' : 'info'} />
                <MutedText>
                  {s.startTimeHHMM && s.endTimeHHMM ? `[${s.startTimeHHMM}–${s.endTimeHHMM}] ` : ''}
                  {s.title} ({s.plannedMinutes} min)
                </MutedText>
                {s.scheduleReason && <MutedText>Reason: {s.scheduleReason}</MutedText>}
                {!isBreak && (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Session notes (optional)"
                      placeholderTextColor={palette.textMuted}
                      value={notesById[s.id] ?? s.notes}
                      onChangeText={(txt) => setNotesById((prev) => ({ ...prev, [s.id]: txt }))}
                    />
                    <View style={styles.rowWrap}>
                      {s.status === 'not_started' && canTransitionSessionStatus(s.status, 'in_progress') && (
                        <SecondaryButton
                          title="Start"
                          onPress={() => updateStudySessionLifecycle(s, 'in_progress', { notes: notesById[s.id] })}
                        />
                      )}
                      {canTransitionSessionStatus(s.status, 'partially_completed') && s.status !== 'partially_completed' && (
                        <SecondaryButton
                          title="Partial"
                          onPress={() => updateStudySessionLifecycle(s, 'partially_completed', { notes: notesById[s.id] })}
                        />
                      )}
                      {canTransitionSessionStatus(s.status, 'completed') && s.status !== 'completed' && (
                        <PrimaryButton
                          title="Complete ✓"
                          onPress={() => updateStudySessionLifecycle(s, 'completed', { notes: notesById[s.id] })}
                        />
                      )}
                      {canTransitionSessionStatus(s.status, 'postponed') && s.status !== 'postponed' && s.status !== 'completed' && (
                        <SecondaryButton
                          title="Postpone"
                          onPress={() => updateStudySessionLifecycle(s, 'postponed', { notes: notesById[s.id] })}
                        />
                      )}
                      {canTransitionSessionStatus(s.status, 'skipped') && s.status !== 'skipped' && s.status !== 'completed' && (
                        <SecondaryButton
                          title="Skip"
                          onPress={() => updateStudySessionLifecycle(s, 'skipped', { notes: notesById[s.id] })}
                        />
                      )}
                    </View>
                  </>
                )}
              </Card>
            );
          })
        )}

        {previewInfo && (
          <Card style={{ backgroundColor: palette.bgSecondary }}>
            <Badge label="Reschedule Preview" tone="info" />
            <MutedText>{previewInfo.summary}</MutedText>
            <View style={styles.rowWrap}>
              <SecondaryButton title="Cancel" onPress={() => setPreviewInfo(null)} />
              <PrimaryButton title="Confirm Revision" onPress={handleConfirmReschedule} />
            </View>
          </Card>
        )}

        <View style={styles.rowWrap}>
          <SecondaryButton title="Preview Adaptive Reschedule" onPress={handlePreview} />
          <PrimaryButton title="Recalculate Missed Sessions" onPress={handleConfirmReschedule} />
        </View>
      </Card>

      <Card>
        <SectionTitle>Weekly & Monthly Rollup</SectionTitle>
        {weekly.map((w) => (
          <MutedText key={w.weekStartISO}>
            Week {w.weekStartISO}: {(w.completedMinutes / 60).toFixed(1)}h / {(w.totalMinutes / 60).toFixed(1)}h
          </MutedText>
        ))}
        {monthly.map((m) => (
          <MutedText key={m.monthKey}>
            Month {m.monthKey}: {m.completedHours}h / {m.totalPlannedHours}h ({m.completedCount}/{m.sessionsCount} sessions)
          </MutedText>
        ))}
      </Card>

      <Card>
        <SectionTitle>Adaptive Recommendations & Plan Adjustments</SectionTitle>
        {showAdaptivePreview && adaptivePlanPreview && (
          <Card style={{ backgroundColor: palette.bgSecondary }}>
            <Badge label="Plan Adjustment Preview (Confirm First)" tone="info" />
            <MutedText>{adaptivePlanPreview.summary}</MutedText>
            <View style={styles.rowWrap}>
              <SecondaryButton title="Cancel" onPress={() => setShowAdaptivePreview(false)} />
              <PrimaryButton
                title="Confirm Adjustments"
                onPress={async () => {
                  await confirmAndApplyAdaptiveAdjustments();
                  setShowAdaptivePreview(false);
                }}
              />
            </View>
          </Card>
        )}
        {snapshot.recommendations.length === 0 ? (
          <MutedText>No active adaptive alerts yet. Complete assessments or sessions to calibrate.</MutedText>
        ) : (
          snapshot.recommendations.map((rec) => (
            <Card key={rec.id} style={{ backgroundColor: palette.bgSecondary }}>
              <Badge label={`${rec.priority} • ${rec.recommendationType ?? rec.trigger}`} tone={rec.priority === 'high' ? 'danger' : 'info'} />
              <MutedText>{rec.title} — {rec.rationale}</MutedText>
              <View style={styles.rowWrap}>
                <SecondaryButton title="Accept" onPress={() => respondToRecommendation(rec.id, 'accepted')} />
                <SecondaryButton title="Dismiss" onPress={() => respondToRecommendation(rec.id, 'dismissed')} />
              </View>
            </Card>
          ))
        )}
        <View style={styles.rowWrap}>
          <SecondaryButton title="Preview Plan Adjustments" onPress={() => setShowAdaptivePreview((v) => !v)} />
          <SecondaryButton title="Refresh Adaptive Rules" onPress={refreshAdaptive} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgPrimary },
  content: { padding: 16 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: palette.textPrimary,
    marginTop: 8,
    marginBottom: 6,
  },
});
