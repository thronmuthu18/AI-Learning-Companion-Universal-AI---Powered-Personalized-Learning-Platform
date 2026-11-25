import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import type { AcademicLevel, LearningFormat } from '@alc/shared-types';
import {
  computeOnboardingCompleteness,
  DEFAULT_LEARNING_PREFERENCES,
  defaultDomainRegistry,
} from '@alc/learning-engine';
import { LearnerProfileInputSchema, sanitizeTextInput } from '@alc/validation';
import { palette } from '@alc/design-system';
import { Badge, Card, MutedText, PrimaryButton, SecondaryButton, SectionTitle } from '../src/components/MobileUI';
import { useMobile } from '../src/state/MobileContext';

const ACADEMIC_LEVELS: Array<{ value: AcademicLevel; label: string }> = [
  { value: 'high_school', label: 'High School' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'working_professional', label: 'Professional' },
  { value: 'self_learner', label: 'Self-Learner' },
];

const LEARNING_FORMATS: Array<{ value: LearningFormat; label: string }> = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'hands_on_projects', label: 'Hands-On Projects' },
  { value: 'interactive_quizzes', label: 'Quizzes' },
  { value: 'reading', label: 'Reading' },
];

export default function OnboardingModal() {
  const { snapshot, saveProfile } = useMobile();
  const existing = snapshot.profile;
  const catalogSkills = useMemo(() => defaultDomainRegistry.getAllSkills(), []);

  const [name, setName] = useState(snapshot.learner?.displayName ?? '');
  const [bg, setBg] = useState(existing?.educationalBackground ?? '');
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>(
    existing?.academicLevel ?? 'undergraduate',
  );
  const [interestsText, setInterestsText] = useState(existing?.interests.join(', ') ?? '');
  const [asp, setAsp] = useState(existing?.careerAspirations ?? '');
  const [skillSearch, setSkillSearch] = useState('');
  const [selfReportedSkills, setSelfReportedSkills] = useState<string[]>(
    existing?.selfReportedSkills ?? [],
  );
  const [targetSkills, setTargetSkills] = useState<string[]>(existing?.targetSkills ?? []);
  const [hours, setHours] = useState(String(existing?.availableHoursPerDay ?? 2));
  const [days, setDays] = useState(String(existing?.studyDaysPerWeek ?? 5));
  const [preferredFormat, setPreferredFormat] = useState<LearningFormat>(
    existing?.preferredFormat ?? 'mixed',
  );
  const [preferredLanguage, setPreferredLanguage] = useState(
    existing?.preferredLanguage ?? 'English',
  );
  const [targetDate, setTargetDate] = useState(existing?.targetCompletionDate ?? '');
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState(
    String(existing?.learningPreferences.sessionLengthMinutes ?? DEFAULT_LEARNING_PREFERENCES.sessionLengthMinutes),
  );
  const [revisionFrequencyDays, setRevisionFrequencyDays] = useState(
    String(existing?.learningPreferences.revisionFrequencyDays ?? DEFAULT_LEARNING_PREFERENCES.revisionFrequencyDays),
  );
  const [reminderTime, setReminderTime] = useState(
    existing?.learningPreferences.dailyReminderTime ?? DEFAULT_LEARNING_PREFERENCES.dailyReminderTime ?? '19:00',
  );
  const [error, setError] = useState<string | null>(null);

  const completeness = useMemo(
    () => computeOnboardingCompleteness(snapshot.learner, existing),
    [snapshot.learner, existing],
  );

  const matchingSkills = useMemo(() => {
    const q = skillSearch.trim().toLowerCase();
    const list = q
      ? catalogSkills.filter((s) => `${s.name} ${s.domain}`.toLowerCase().includes(q))
      : catalogSkills;
    return list.slice(0, 12);
  }, [catalogSkills, skillSearch]);

  const toggleSkill = (current: string[], setter: (v: string[]) => void, id: string) => {
    setter(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  const handleSave = async () => {
    setError(null);
    const payload = {
      displayName: sanitizeTextInput(name, 120),
      educationalBackground: sanitizeTextInput(bg, 300),
      academicLevel,
      interests: interestsText
        .split(',')
        .map((s) => sanitizeTextInput(s, 80))
        .filter(Boolean),
      careerAspirations: sanitizeTextInput(asp, 500),
      selfReportedSkills,
      targetSkills,
      availableHoursPerDay: Number(hours),
      studyDaysPerWeek: Number(days),
      preferredFormat,
      preferredLanguage: sanitizeTextInput(preferredLanguage, 40) || 'English',
      targetCompletionDate: targetDate.trim() ? targetDate.trim() : null,
      learningPreferences: {
        sessionLengthMinutes: Number(sessionLengthMinutes),
        revisionFrequencyDays: Number(revisionFrequencyDays),
        dailyReminderTime: reminderTime.trim() ? reminderTime.trim() : null,
      },
    };

    const parsed = LearnerProfileInputSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' • '));
      return;
    }

    await saveProfile(parsed.data);
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Badge label="Offline Local Profile • Optional Export/Sync" tone="info" />
        <SectionTitle>{existing ? 'Learner Profile & History' : 'Learner Onboarding'}</SectionTitle>
        <MutedText>
          Completeness: {completeness.percentComplete}% • Capacity: {completeness.weeklyStudyHoursCapacity}h/week
        </MutedText>
        <MutedText>
          Self-reported skills seed unassessed baselines until verified by diagnostic assessments.
        </MutedText>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <MutedText>Display Name</MutedText>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={palette.textMuted}
        />

        <MutedText>Educational Background</MutedText>
        <TextInput
          style={styles.input}
          value={bg}
          onChangeText={setBg}
          placeholder="e.g., B.E. ECE, B.Com Accounting, Class 12 Science, Self-Taught"
          placeholderTextColor={palette.textMuted}
        />

        <MutedText>Academic Level</MutedText>
        <View style={styles.rowWrap}>
          {ACADEMIC_LEVELS.map((lvl) => (
            <SecondaryButton
              key={lvl.value}
              title={academicLevel === lvl.value ? `✓ ${lvl.label}` : lvl.label}
              onPress={() => setAcademicLevel(lvl.value)}
            />
          ))}
        </View>

        <MutedText>Interests (comma-separated across any domain)</MutedText>
        <TextInput
          style={styles.input}
          value={interestsText}
          onChangeText={setInterestsText}
          placeholder="e.g., Signals, Accounting, Physics, Python, UPSC"
          placeholderTextColor={palette.textMuted}
        />

        <MutedText>Learning / Career Aspirations</MutedText>
        <TextInput
          style={styles.input}
          value={asp}
          onChangeText={setAsp}
          placeholder="e.g., Crack GATE ECE, Financial Analysis, Physics"
          placeholderTextColor={palette.textMuted}
        />

        <MutedText>Search Universal Skills (All Domains)</MutedText>
        <TextInput
          style={styles.input}
          value={skillSearch}
          onChangeText={setSkillSearch}
          placeholder="Filter skills (e.g., Signals, Accounting, Quantum, Python)..."
          placeholderTextColor={palette.textMuted}
        />

        <MutedText>Existing Self-Reported Skills ({selfReportedSkills.length} selected)</MutedText>
        {matchingSkills.map((sk) => {
          const active = selfReportedSkills.includes(sk.id);
          return (
            <SecondaryButton
              key={`sr_${sk.id}`}
              title={`${active ? '✓ ' : ''}${sk.name}`}
              onPress={() => toggleSkill(selfReportedSkills, setSelfReportedSkills, sk.id)}
            />
          );
        })}

        <MutedText>Target Skills ({targetSkills.length} selected)</MutedText>
        {matchingSkills.map((sk) => {
          const active = targetSkills.includes(sk.id);
          return (
            <SecondaryButton
              key={`tgt_${sk.id}`}
              title={`${active ? '✓ ' : ''}${sk.name}`}
              onPress={() => toggleSkill(targetSkills, setTargetSkills, sk.id)}
            />
          );
        })}

        <MutedText>Available Hours / Day</MutedText>
        <TextInput style={styles.input} value={hours} onChangeText={setHours} keyboardType="numeric" />

        <MutedText>Study Days / Week</MutedText>
        <TextInput style={styles.input} value={days} onChangeText={setDays} keyboardType="numeric" />

        <MutedText>Preferred Learning Format</MutedText>
        <View style={styles.rowWrap}>
          {LEARNING_FORMATS.map((fmt) => (
            <SecondaryButton
              key={fmt.value}
              title={preferredFormat === fmt.value ? `✓ ${fmt.label}` : fmt.label}
              onPress={() => setPreferredFormat(fmt.value)}
            />
          ))}
        </View>

        <MutedText>Preferred Language</MutedText>
        <TextInput
          style={styles.input}
          value={preferredLanguage}
          onChangeText={setPreferredLanguage}
          placeholder="English"
          placeholderTextColor={palette.textMuted}
        />

        <MutedText>Target Completion Date (YYYY-MM-DD, optional)</MutedText>
        <TextInput
          style={styles.input}
          value={targetDate}
          onChangeText={setTargetDate}
          placeholder="2027-03-01"
          placeholderTextColor={palette.textMuted}
        />

        <MutedText>Session Length (minutes)</MutedText>
        <TextInput
          style={styles.input}
          value={sessionLengthMinutes}
          onChangeText={setSessionLengthMinutes}
          keyboardType="numeric"
        />

        <MutedText>Revision Frequency (days)</MutedText>
        <TextInput
          style={styles.input}
          value={revisionFrequencyDays}
          onChangeText={setRevisionFrequencyDays}
          keyboardType="numeric"
        />

        <MutedText>Daily Reminder Time (HH:MM)</MutedText>
        <TextInput
          style={styles.input}
          value={reminderTime}
          onChangeText={setReminderTime}
          placeholder="19:00"
          placeholderTextColor={palette.textMuted}
        />

        <PrimaryButton title="Save Profile" onPress={handleSave} />
      </Card>

      {existing && existing.history.length > 0 && (
        <Card>
          <SectionTitle>Profile Change History</SectionTitle>
          {existing.history.map((h, idx) => (
            <MutedText key={`${h.timestamp}_${idx}`}>
              • {new Date(h.timestamp).toLocaleString()} — {h.note} ({h.changedFields.join(', ')})
            </MutedText>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgPrimary },
  content: { padding: 16 },
  rowWrap: { marginBottom: 10 },
  errorText: {
    color: '#F87171',
    marginBottom: 12,
    fontSize: 13,
  },
  input: {
    backgroundColor: palette.bgInput,
    borderColor: palette.borderSubtle,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: palette.textPrimary,
    marginBottom: 12,
    marginTop: 4,
  },
});
