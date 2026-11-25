import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import type { GoalPriority } from '@alc/shared-types';
import {
  defaultDomainRegistry,
  GOAL_TEMPLATES,
  interpretGoalDeterministically,
  mergeLlamaGoalInterpretation,
  validateLearningGoalInput,
  type StructuredGoalInterpretation,
} from '@alc/learning-engine';
import { palette } from '@alc/design-system';
import { Badge, Card, MutedText, PrimaryButton, SectionTitle, SecondaryButton } from '../../src/components/MobileUI';
import { useMobile } from '../../src/state/MobileContext';

export default function RoadmapTab() {
  const {
    snapshot,
    activeGoal,
    activePath,
    roadmapProgressStats,
    skillGap,
    goalPrioritization,
    aiStatus,
    advisoryService,
    setFocusedGoalId,
    selectOrCreateGoal,
    updateGoalDetails,
    changeGoalStatus,
    changeGoalPriority,
    deleteGoalSafely,
    regenerateRoadmapAndSchedule,
    toggleRoadmapActivity,
  } = useMobile();

  const [searchQuery, setSearchQuery] = useState('');
  const [freeText, setFreeText] = useState('');
  const [goalPriority, setGoalPriority] = useState<GoalPriority>('medium');
  const [targetDate, setTargetDate] = useState('');
  const [preview, setPreview] = useState<StructuredGoalInterpretation | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');

  const allDomains = useMemo(() => defaultDomainRegistry.listDomains(), []);
  const allSkills = useMemo(() => defaultDomainRegistry.getAllSkills(), []);
  const catalogMatch = useMemo(
    () => defaultDomainRegistry.searchCatalog(searchQuery),
    [searchQuery],
  );

  const handleInterpretGoal = async () => {
    setStatusMessage(null);
    if (!freeText.trim()) {
      setStatusMessage('Enter a natural-language learning goal first.');
      return;
    }

    if (aiStatus.state === 'ready') {
      try {
        const res = await advisoryService.interpretGoal(
          freeText.trim(),
          allSkills.map((s) => s.slug),
        );
        if (res.ok) {
          setPreview(
            mergeLlamaGoalInterpretation({
              rawGoalText: freeText.trim(),
              llamaOutput: res.data,
              targetCompletionDate: targetDate.trim() || null,
              profile: snapshot.profile,
              learnerSkills: snapshot.learnerSkills,
            }),
          );
          return;
        }
      } catch {
        // Fall through cleanly to transparent deterministic fallback
      }
    }

    setPreview(
      interpretGoalDeterministically({
        rawGoalText: freeText.trim(),
        targetCompletionDate: targetDate.trim() || null,
        profile: snapshot.profile,
        learnerSkills: snapshot.learnerSkills,
      }),
    );
  };

  const handleConfirmPreview = async () => {
    if (!preview) return;
    const validation = validateLearningGoalInput({
      title: preview.title,
      domainId: preview.domainId ?? undefined,
      targetSkillIds: preview.targetSkillIds,
      targetCompletionDate: preview.targetCompletionDate,
      existingGoals: snapshot.goals,
      profile: snapshot.profile,
      learnerSkills: snapshot.learnerSkills,
    });
    if (!validation.valid) {
      setStatusMessage(validation.errors.join(' • '));
      return;
    }
    await selectOrCreateGoal(
      preview.category,
      preview.title,
      preview.targetSkillIds,
      preview.domainId ?? undefined,
      {
        priority: goalPriority,
        targetCompletionDate: preview.targetCompletionDate,
        goalKind: preview.learningPurpose,
        horizon: preview.horizon,
        interpretedByAI: preview.interpretationSource === 'llm_local',
        interpretationMode: preview.interpretationSource,
        structuredObjectives: preview.structuredObjectives,
        rawDescription: freeText.trim() || preview.rationale,
      },
    );
    setPreview(null);
    setFreeText('');
    setStatusMessage('Goal created and added to multi-goal prioritization dashboard.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>Multi-Goal Prioritization & Workload ({goalPrioritization.weeklyCapacityHours}h/wk Budget)</SectionTitle>
        <MutedText>
          Allocated: {goalPrioritization.totalAllocatedWeeklyHours}h/wk across {goalPrioritization.allocations.length} active goal(s).
        </MutedText>
        {goalPrioritization.overloadWarning && (
          <Text style={styles.warningText}>{goalPrioritization.overloadWarning}</Text>
        )}
        {snapshot.goals.length === 0 ? (
          <MutedText>No goals created yet. Use Free-Text Interpretation or Domain Explorer below.</MutedText>
        ) : (
          snapshot.goals.map((g) => {
            const alloc = goalPrioritization.allocations.find((a) => a.goalId === g.id);
            const gStatus = g.status ?? (g.isActive ? 'active' : 'paused');
            return (
              <Card key={g.id} style={{ backgroundColor: palette.bgSecondary, marginTop: 10 }}>
                <SectionTitle>
                  {g.id === activeGoal?.id ? '★ ' : ''}
                  {g.title}
                </SectionTitle>
                <Badge
                  label={`${gStatus.toUpperCase()} • ${(g.priority ?? 'medium').toUpperCase()} PRIORITY`}
                  tone={gStatus === 'active' ? 'success' : 'info'}
                />
                <MutedText>
                  Source: {g.interpretationMode ?? (g.interpretedByAI ? 'llm_local' : 'manual')} • Target Date: {g.targetCompletionDate ?? 'Flexible'}
                </MutedText>
                {alloc && (
                  <MutedText>
                    Allocated: {alloc.allocatedWeeklyHours}h/wk • Remaining: {alloc.remainingHours}h (~{alloc.estimatedWeeksAtAllocation}w)
                  </MutedText>
                )}
                <View style={styles.rowWrap}>
                  <SecondaryButton title="Focus Roadmap" onPress={() => setFocusedGoalId(g.id)} />
                  <SecondaryButton
                    title={gStatus === 'active' ? 'Pause' : 'Resume'}
                    onPress={() => changeGoalStatus(g.id, gStatus === 'active' ? 'paused' : 'active')}
                  />
                  {gStatus !== 'archived' && (
                    <SecondaryButton
                      title="Archive"
                      onPress={() => changeGoalStatus(g.id, 'archived', 'Archived by learner')}
                    />
                  )}
                  <SecondaryButton
                    title="Cycle Priority"
                    onPress={() => {
                      const next: GoalPriority =
                        g.priority === 'high' ? 'low' : g.priority === 'low' ? 'medium' : 'high';
                      changeGoalPriority(g.id, next);
                    }}
                  />
                  <SecondaryButton
                    title="Edit"
                    onPress={() => {
                      setEditingGoalId(editingGoalId === g.id ? null : g.id);
                      setEditTitle(g.title);
                      setEditDate(g.targetCompletionDate ?? '');
                    }}
                  />
                  <SecondaryButton title="Delete" onPress={() => deleteGoalSafely(g.id)} />
                </View>
                {editingGoalId === g.id && (
                  <View style={{ marginTop: 8 }}>
                    <TextInput
                      style={styles.input}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      placeholder="Goal title"
                      placeholderTextColor={palette.textMuted}
                    />
                    <TextInput
                      style={styles.input}
                      value={editDate}
                      onChangeText={setEditDate}
                      placeholder="Target YYYY-MM-DD (optional)"
                      placeholderTextColor={palette.textMuted}
                    />
                    <PrimaryButton
                      title="Save Goal Edit"
                      onPress={async () => {
                        await updateGoalDetails(g.id, {
                          title: editTitle.trim() || g.title,
                          targetCompletionDate: editDate.trim() || null,
                        });
                        setEditingGoalId(null);
                      }}
                    />
                  </View>
                )}
              </Card>
            );
          })
        )}
      </Card>

      <Card>
        <SectionTitle>Natural-Language Goal Interpretation & Clarification</SectionTitle>
        <TextInput
          style={styles.input}
          value={freeText}
          onChangeText={setFreeText}
          placeholder="e.g., Prepare for GATE ECE Signals or Learn Business Accounting balance sheets..."
          placeholderTextColor={palette.textMuted}
        />
        <TextInput
          style={styles.input}
          value={targetDate}
          onChangeText={setTargetDate}
          placeholder="Target date YYYY-MM-DD (optional)"
          placeholderTextColor={palette.textMuted}
        />
        <View style={styles.rowWrap}>
          {(['high', 'medium', 'low'] as const).map((p) => (
            <SecondaryButton
              key={p}
              title={goalPriority === p ? `✓ ${p} priority` : `${p} priority`}
              onPress={() => setGoalPriority(p)}
            />
          ))}
        </View>
        <PrimaryButton
          title={aiStatus.state === 'ready' ? 'Interpret with Local Llama 3.2' : 'Interpret with Deterministic Catalogue'}
          onPress={handleInterpretGoal}
        />
        {statusMessage && <MutedText>{statusMessage}</MutedText>}

        {preview && (
          <Card style={{ backgroundColor: palette.bgSecondary, marginTop: 10 }}>
            <Badge
              label={preview.interpretationSource === 'llm_local' ? 'Local Llama 3.2 Output' : 'Deterministic Catalogue Fallback'}
              tone={preview.interpretationSource === 'llm_local' ? 'success' : 'info'}
            />
            <SectionTitle>{preview.title}</SectionTitle>
            <MutedText>Domain: {preview.domainName} • Subject: {preview.subjectName}</MutedText>
            <MutedText>
              Level: {preview.expectedProficiencyLevel} • Purpose: {preview.learningPurpose} • Scope: {preview.estimatedLearningScope.totalHours}h (~{preview.estimatedLearningScope.estimatedWeeks}w)
            </MutedText>
            {preview.missingInformation.map((m, idx) => (
              <Text key={idx} style={styles.warningText}>Clarification: {m}</Text>
            ))}
            {preview.targetSkillNames.map((n, idx) => (
              <MutedText key={idx}>• Target Skill: {n}</MutedText>
            ))}
            <PrimaryButton title="Validate & Save Interpreted Goal" onPress={handleConfirmPreview} />
          </Card>
        )}
      </Card>

      <Card>
        <SectionTitle>All-Domain Discovery & Search ({allDomains.length} Domains)</SectionTitle>
        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search domains or skills (GATE ECE, Accounting, Physics, UPSC, Design...)"
          placeholderTextColor={palette.textMuted}
        />
        {GOAL_TEMPLATES.filter((t) => t.targetSkillIds.length > 0).map((tpl) => (
          <SecondaryButton
            key={tpl.category}
            title={tpl.title}
            onPress={() => selectOrCreateGoal(tpl.category)}
          />
        ))}
        {searchQuery.trim().length > 0 && (
          <Card style={{ backgroundColor: palette.bgSecondary, marginTop: 10 }}>
            <SectionTitle>Matching Domains & Skills</SectionTitle>
            {catalogMatch.domains.slice(0, 6).map((dom) => (
              <MutedText key={dom.id}>
                • {dom.name} [{dom.contentStatus}]
              </MutedText>
            ))}
            {catalogMatch.skills.slice(0, 6).map((skill) => (
              <SecondaryButton
                key={skill.id}
                title={`Add Goal: ${skill.name}`}
                onPress={() =>
                  selectOrCreateGoal(skill.domainId ?? skill.domain, `${skill.name} Focus`, [skill.id], skill.domainId)
                }
              />
            ))}
          </Card>
        )}
      </Card>

      <Card>
        <SectionTitle>Skill Gap & Prerequisite Graph ({activeGoal?.title ?? 'Select a Goal'})</SectionTitle>
        <Badge
          label={skillGap.hasCycle ? `Cycle: ${skillGap.cyclePath.join(' -> ')}` : 'Acyclic DAG Verified'}
          tone={skillGap.hasCycle ? 'danger' : 'success'}
        />
        <MutedText>Strong: {skillGap.strongSkills.map((s) => s.name).join(', ') || 'None'}</MutedText>
        <MutedText>Weak: {skillGap.weakSkills.map((s) => s.name).join(', ') || 'None'}</MutedText>
        <MutedText>Missing: {skillGap.missingSkills.map((s) => s.name).join(', ') || 'None'}</MutedText>
        <MutedText>Unassessed: {skillGap.unassessedSkills.map((s) => s.name).join(', ') || 'None'}</MutedText>
        <MutedText>
          Ready Next (Foundations Met): {skillGap.recommendedNextSkills.map((s) => s.name).join(', ') || 'None'}
        </MutedText>
        {skillGap.blockedSkills.map((b) => (
          <Text key={b.skill.id} style={styles.warningText}>
            Locked: {b.skill.name} (requires {b.blockedBy.map((p) => p.name).join(', ')})
          </Text>
        ))}
        <PrimaryButton title="Run Diagnostic Assessment" onPress={() => router.push('/assessment')} />
      </Card>

      {activePath && (
        <Card>
          <SectionTitle>{activePath.title}</SectionTitle>
          <MutedText>
            Effort: {activePath.totalEstimatedHours} hrs • Budget: {activePath.weeklyHoursBudget ?? '—'}h/wk (~{activePath.estimatedWeeks ?? '—'}w)
          </MutedText>
          {roadmapProgressStats && (
            <MutedText>
              Progress: {roadmapProgressStats.completedActivities}/{roadmapProgressStats.totalActivities} activities ({roadmapProgressStats.completionPercent}%) • Actual {roadmapProgressStats.actualMinutes}m / Est {roadmapProgressStats.estimatedMinutes}m
            </MutedText>
          )}
          {activePath.deadlineStatus?.warning && (
            <Text style={styles.warningText}>{activePath.deadlineStatus.warning}</Text>
          )}
          <SecondaryButton
            title="Regenerate Roadmap (Preserve Completed)"
            onPress={regenerateRoadmapAndSchedule}
          />
          {activePath.stages.map((st) => (
            <Card key={st.id} style={{ backgroundColor: palette.bgSecondary, marginTop: 10 }}>
              <SectionTitle>{st.title}</SectionTitle>
              {st.milestones.map((m) => (
                <Card key={m.id} style={{ backgroundColor: palette.bgPrimary, marginTop: 8 }}>
                  <Badge label={`${m.readinessState ?? m.status} • ${m.estimatedHours}h`} tone={m.readinessState === 'blocked' ? 'info' : 'success'} />
                  <SectionTitle>{m.title}</SectionTitle>
                  {m.reason && <MutedText>{m.reason}</MutedText>}
                  {m.activities.map((a) => {
                    const done = a.status === 'completed';
                    return (
                      <SecondaryButton
                        key={a.id}
                        title={`${done ? '✓ ' : '○ '}${a.title} (${a.estimatedMinutes}m)`}
                        onPress={() =>
                          toggleRoadmapActivity(
                            activePath.id,
                            a.id,
                            done ? 'not_started' : 'completed',
                            a.estimatedMinutes,
                          )
                        }
                      />
                    );
                  })}
                </Card>
              ))}
            </Card>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgPrimary },
  content: { padding: 16 },
  rowWrap: { marginTop: 6, marginBottom: 6 },
  warningText: { color: '#FBBF24', fontSize: 13, marginVertical: 4 },
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
