import React, { useMemo, useState } from 'react';
import type { AcademicLevel, GoalCategory, GoalKind, GoalPriority, LearningFormat } from '@alc/shared-types';
import {
  computeOnboardingCompleteness,
  DEFAULT_LEARNING_PREFERENCES,
  defaultDomainRegistry,
  GOAL_TEMPLATES,
  interpretGoalDeterministically,
  mergeLlamaGoalInterpretation,
  validateLearningGoalInput,
  type StructuredGoalInterpretation,
} from '@alc/learning-engine';
import { LearnerProfileInputSchema, sanitizeTextInput } from '@alc/validation';
import { Brain, CheckCircle2, Compass, Search, Sparkles, UserCheck } from 'lucide-react';
import { useApp } from '../state/AppContext';

export const SplashScreen: React.FC = () => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
    <div style={{ textAlign: 'center', maxWidth: 420 }}>
      <div className="brand-badge" style={{ width: 64, height: 64, margin: '0 auto 16px', fontSize: 24 }}>
        <Brain size={32} />
      </div>
      <h1 style={{ margin: '0 0 8px', fontSize: 28 }}>AI Learning Companion</h1>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        Initializing local IndexedDB persistence & WebGPU capabilities...
      </p>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: '75%' }} />
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 14 }}>Built with Llama 3.2 • 100% Offline-First</p>
    </div>
  </div>
);

export const WelcomeScreen: React.FC = () => {
  const { navigate, aiCapabilities, isOnline } = useApp();
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 760, width: '100%', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span className="badge badge-info">Built with Llama 3.2 • Local Inference</span>
          <span className={`badge ${isOnline ? 'badge-success' : 'badge-warning'}`}>
            {isOnline ? 'Online (Model Cache Ready)' : 'Offline Mode Active'}
          </span>
        </div>
        <h1 style={{ fontSize: 34, margin: '18px 0 10px', lineHeight: 1.2 }}>
          Your Offline-First Personalised Learning Ecosystem
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 24 }}>
          Diagnose verified skill gaps, eliminate prerequisite blockers, follow adaptive study schedules, and consult a genuine locally executed Meta Llama 3.2 model—zero cloud LLM APIs required.
        </p>

        <div className="card-grid" style={{ marginBottom: 24 }}>
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <Compass size={20} color="#06B6D4" />
            <h3 style={{ margin: '8px 0 4px', fontSize: 16 }}>Prerequisite-Safe Roadmaps</h3>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)' }}>
              Directed skill graphs prevent recommending advanced topics before foundations are verified.
            </p>
          </div>
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <Brain size={20} color="#6366F1" />
            <h3 style={{ margin: '8px 0 4px', fontSize: 16 }}>Local WebGPU Llama 3.2</h3>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)' }}>
              {aiCapabilities?.backend === 'webgpu'
                ? 'WebGPU hardware acceleration detected in this browser.'
                : aiCapabilities?.reasonIfUnsupported ?? 'Checking WebGPU hardware support.'}
            </p>
          </div>
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <UserCheck size={20} color="#10B981" />
            <h3 style={{ margin: '8px 0 4px', fontSize: 16 }}>Private Local Storage</h3>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)' }}>
              IndexedDB storage with SHA-256 verified JSON export/import across Web, Android, and iOS.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('onboarding')}>
            Begin Learner Onboarding
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('data_import')}>
            Import Existing Backup
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('model_settings')}>
            Configure Local Llama Model
          </button>
        </div>
      </div>
    </div>
  );
};

export const OnboardingAndProfileScreen: React.FC<{ isEditMode: boolean }> = ({ isEditMode }) => {
  const { snapshot, saveProfile, navigate } = useApp();
  const existing = snapshot.profile;
  const catalogSkills = useMemo(() => defaultDomainRegistry.getAllSkills(), []);

  const [displayName, setDisplayName] = useState(snapshot.learner?.displayName ?? '');
  const [educationalBackground, setEducationalBackground] = useState(
    existing?.educationalBackground ?? '',
  );
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>(
    existing?.academicLevel ?? 'undergraduate',
  );
  const [interestsText, setInterestsText] = useState(
    existing?.interests.join(', ') ?? '',
  );
  const [careerAspirations, setCareerAspirations] = useState(
    existing?.careerAspirations ?? '',
  );
  const [skillFilter, setSkillFilter] = useState('');
  const [selfReportedSkills, setSelfReportedSkills] = useState<string[]>(
    existing?.selfReportedSkills ?? [],
  );
  const [targetSkills, setTargetSkills] = useState<string[]>(
    existing?.targetSkills ?? [],
  );
  const [availableHoursPerDay, setAvailableHoursPerDay] = useState(
    existing?.availableHoursPerDay ?? 2,
  );
  const [studyDaysPerWeek, setStudyDaysPerWeek] = useState(existing?.studyDaysPerWeek ?? 5);
  const [preferredFormat, setPreferredFormat] = useState<LearningFormat>(
    existing?.preferredFormat ?? 'mixed',
  );
  const [preferredLanguage, setPreferredLanguage] = useState(
    existing?.preferredLanguage ?? 'English',
  );
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    existing?.targetCompletionDate ?? '',
  );
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState(
    existing?.learningPreferences.sessionLengthMinutes ?? DEFAULT_LEARNING_PREFERENCES.sessionLengthMinutes,
  );
  const [revisionFrequencyDays, setRevisionFrequencyDays] = useState(
    existing?.learningPreferences.revisionFrequencyDays ?? DEFAULT_LEARNING_PREFERENCES.revisionFrequencyDays,
  );
  const [dailyReminderTime, setDailyReminderTime] = useState(
    existing?.learningPreferences.dailyReminderTime ?? DEFAULT_LEARNING_PREFERENCES.dailyReminderTime ?? '19:00',
  );
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const completeness = useMemo(
    () => computeOnboardingCompleteness(snapshot.learner, existing),
    [snapshot.learner, existing],
  );

  const toggleItem = (list: string[], setter: (v: string[]) => void, id: string) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(null);

    const payload = {
      displayName: sanitizeTextInput(displayName, 120),
      educationalBackground: sanitizeTextInput(educationalBackground, 300),
      academicLevel,
      interests: interestsText
        .split(',')
        .map((s) => sanitizeTextInput(s, 80))
        .filter(Boolean),
      careerAspirations: sanitizeTextInput(careerAspirations, 500),
      selfReportedSkills,
      targetSkills,
      availableHoursPerDay: Number(availableHoursPerDay),
      studyDaysPerWeek: Number(studyDaysPerWeek),
      preferredFormat,
      preferredLanguage: sanitizeTextInput(preferredLanguage, 40),
      targetCompletionDate: targetCompletionDate.trim() ? targetCompletionDate.trim() : null,
      learningPreferences: {
        sessionLengthMinutes: Number(sessionLengthMinutes),
        revisionFrequencyDays: Number(revisionFrequencyDays),
        dailyReminderTime: dailyReminderTime.trim() ? dailyReminderTime.trim() : null,
      },
    };

    const parsed = LearnerProfileInputSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' • '));
      return;
    }

    await saveProfile(parsed.data);
    if (isEditMode) {
      setSavedNotice('Learner profile updated and persisted locally.');
    } else {
      navigate('goals');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>
          {isEditMode ? 'Learner Profile & History' : 'Step 1: Learner Onboarding'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
          Self-reported skills help seed your baseline, while verified mastery is always determined by assessments. Stored locally in IndexedDB with zero remote account server required (portable anytime via verified JSON Export/Import or optional future cloud sync).
        </p>

        {existing && (
          <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <span>
                <strong>Profile Completeness:</strong> {completeness.percentComplete}%
              </span>
              <span>
                <strong>Weekly Capacity:</strong> {completeness.weeklyStudyHoursCapacity} hrs/week
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: 12, borderRadius: 10, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {savedNotice && (
          <div className="badge badge-success" style={{ width: '100%', padding: 12, borderRadius: 10, marginBottom: 16 }}>
            <CheckCircle2 size={16} /> {savedNotice}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div className="card-grid">
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Learner Name</label>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Ananya Sharma"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Academic Level</label>
              <select
                className="select"
                value={academicLevel}
                onChange={(e) => setAcademicLevel(e.target.value as AcademicLevel)}
              >
                <option value="high_school">High School</option>
                <option value="undergraduate">Undergraduate</option>
                <option value="graduate">Graduate</option>
                <option value="working_professional">Working Professional</option>
                <option value="self_learner">Independent Self-Learner</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Educational Background</label>
              <input
                className="input"
                value={educationalBackground}
                onChange={(e) => setEducationalBackground(e.target.value)}
                placeholder="e.g., B.E. Electronics, B.Com Finance, Class 12 Science, Self-Taught"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Preferred Language</label>
              <input
                className="input"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
              />
            </div>
          </div>

          <div className="card-grid">
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Available Hours / Day</label>
              <input
                className="input"
                type="number"
                step="0.5"
                min="0.5"
                max="14"
                value={availableHoursPerDay}
                onChange={(e) => setAvailableHoursPerDay(Number(e.target.value))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Study Days / Week</label>
              <input
                className="input"
                type="number"
                min="1"
                max="7"
                value={studyDaysPerWeek}
                onChange={(e) => setStudyDaysPerWeek(Number(e.target.value))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Preferred Learning Format</label>
              <select
                className="select"
                value={preferredFormat}
                onChange={(e) => setPreferredFormat(e.target.value as LearningFormat)}
              >
                <option value="mixed">Mixed (Lessons + Quizzes + Projects)</option>
                <option value="hands_on_projects">Hands-On Projects First</option>
                <option value="interactive_quizzes">Interactive Quizzes First</option>
                <option value="reading">Structured Reading & Notes</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Target Completion Date (Optional)</label>
              <input
                className="input"
                type="date"
                value={targetCompletionDate}
                onChange={(e) => setTargetCompletionDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Interests (comma-separated across any field)</label>
            <input
              className="input"
              value={interestsText}
              onChange={(e) => setInterestsText(e.target.value)}
              placeholder="e.g., Signal Processing, Financial Accounting, Python, Mechanics, UPSC"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Learning or Career Aspirations</label>
            <textarea
              className="textarea"
              rows={2}
              value={careerAspirations}
              onChange={(e) => setCareerAspirations(e.target.value)}
              placeholder="e.g., Crack GATE ECE, build accounting mastery, or launch software engineering projects"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Filter Skills Across All Domains</label>
            <input
              className="input"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              placeholder="Search skills (e.g., Signals, Accounting, Physics, Python, Quantitative)..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
              Existing Self-Reported Skills (Marked "Unassessed" until verified by quiz/assessment)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {catalogSkills
                .filter((s) => !skillFilter.trim() || `${s.name} ${s.domain}`.toLowerCase().includes(skillFilter.trim().toLowerCase()))
                .map((s) => {
                  const active = selfReportedSkills.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: 12.5 }}
                      onClick={() => toggleItem(selfReportedSkills, setSelfReportedSkills, s.id)}
                    >
                      {s.name}
                    </button>
                  );
                })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>Target Skills</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {catalogSkills
                .filter((s) => !skillFilter.trim() || `${s.name} ${s.domain}`.toLowerCase().includes(skillFilter.trim().toLowerCase()))
                .map((s) => {
                  const active = targetSkills.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: 12.5 }}
                      onClick={() => toggleItem(targetSkills, setTargetSkills, s.id)}
                    >
                      {s.name}
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="card-grid">
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Session Length (minutes)</label>
              <input
                className="input"
                type="number"
                min="5"
                max="240"
                value={sessionLengthMinutes}
                onChange={(e) => setSessionLengthMinutes(Number(e.target.value))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Revision Frequency (days)</label>
              <input
                className="input"
                type="number"
                min="1"
                max="30"
                value={revisionFrequencyDays}
                onChange={(e) => setRevisionFrequencyDays(Number(e.target.value))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Daily Study Reminder Time</label>
              <input
                className="input"
                type="time"
                value={dailyReminderTime}
                onChange={(e) => setDailyReminderTime(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-primary" type="submit">
              {isEditMode ? 'Save Profile Changes' : 'Save & Continue to Goal Selection'}
            </button>
          </div>
        </form>
      </div>

      {isEditMode && existing && existing.history.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Profile Change History</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)' }}>
            {existing.history.map((h, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                <strong>{new Date(h.timestamp).toLocaleString()}</strong> — {h.note}
                {h.changedFields.length > 0 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                    {' '}({h.changedFields.join(', ')})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const GoalSelectionScreen: React.FC = () => {
  const {
    snapshot,
    activeGoal,
    focusedGoalId,
    setFocusedGoalId,
    goalPrioritization,
    selectOrCreateGoal,
    updateGoalDetails,
    changeGoalStatus,
    changeGoalPriority,
    deleteGoalSafely,
    advisoryService,
    aiStatus,
    navigate,
  } = useApp();

  const allDomains = useMemo(() => defaultDomainRegistry.listDomains(), []);
  const allSkills = useMemo(() => defaultDomainRegistry.getAllSkills(), []);

  const [selectedCategory, setSelectedCategory] = useState<GoalCategory>(
    activeGoal?.category ?? GOAL_TEMPLATES[0]?.category ?? 'gate_ece',
  );
  const [selectedDomainId, setSelectedDomainId] = useState<string>(
    activeGoal?.domainId ?? allDomains[0]?.id ?? 'dom_ece',
  );
  const [domainSearch, setDomainSearch] = useState('');
  const [explorerSkillIds, setExplorerSkillIds] = useState<string[]>(activeGoal?.targetSkillIds ?? []);
  const [customGoalTitle, setCustomGoalTitle] = useState('');
  const [customGoalText, setCustomGoalText] = useState('');
  const [customPriority, setCustomPriority] = useState<GoalPriority>('medium');
  const [customGoalKind, setCustomGoalKind] = useState<GoalKind>('academic');
  const [customTargetDate, setCustomTargetDate] = useState('');
  const [interpretationPreview, setInterpretationPreview] =
    useState<StructuredGoalInterpretation | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [detailGoalId, setDetailGoalId] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const selectedTemplate =
    GOAL_TEMPLATES.find((t) => t.category === selectedCategory) ?? GOAL_TEMPLATES[0]!;

  const filteredDomains = useMemo(() => {
    const q = domainSearch.trim().toLowerCase();
    if (!q) return allDomains;
    return allDomains.filter((d) => `${d.name} ${d.summary}`.toLowerCase().includes(q));
  }, [allDomains, domainSearch]);

  const activeDomain = allDomains.find((d) => d.id === selectedDomainId) ?? allDomains[0];
  const domainSubjects = useMemo(
    () => (activeDomain ? defaultDomainRegistry.listSubjectsByDomain(activeDomain.id) : []),
    [activeDomain],
  );
  const searchResults = useMemo(
    () =>
      domainSearch.trim()
        ? defaultDomainRegistry.searchCatalog(domainSearch.trim())
        : {
            domains: allDomains,
            subjects: domainSubjects,
            skills: allSkills.filter((s) => s.domainId === activeDomain?.id),
          },
    [domainSearch, allDomains, domainSubjects, allSkills, activeDomain],
  );

  const previewValidation = useMemo(() => {
    if (!interpretationPreview) return null;
    return validateLearningGoalInput({
      title: interpretationPreview.title,
      domainId: interpretationPreview.domainId ?? undefined,
      targetSkillIds: interpretationPreview.targetSkillIds,
      targetCompletionDate: interpretationPreview.targetCompletionDate,
      existingGoals: snapshot.goals,
      profile: snapshot.profile,
      learnerSkills: snapshot.learnerSkills,
    });
  }, [interpretationPreview, snapshot.goals, snapshot.profile, snapshot.learnerSkills]);

  const handleApplyPredefined = async () => {
    if (selectedTemplate.targetSkillIds.length === 0) {
      setAiMessage(
        'Custom pathway requires selecting target skills in the Universal Domain Explorer below or interpreting a goal above.',
      );
      return;
    }
    const domainId = allSkills.find((s) => s.id === selectedTemplate.targetSkillIds[0])?.domainId;
    const validation = validateLearningGoalInput({
      title: selectedTemplate.title,
      domainId,
      targetSkillIds: selectedTemplate.targetSkillIds,
      targetCompletionDate: customTargetDate.trim() || null,
      existingGoals: snapshot.goals,
      profile: snapshot.profile,
      learnerSkills: snapshot.learnerSkills,
    });
    if (!validation.valid) {
      setAiMessage(validation.errors.join(' • '));
      return;
    }
    await selectOrCreateGoal({
      category: selectedTemplate.category,
      domainId,
      title: selectedTemplate.title,
      rawDescription: selectedTemplate.description,
      structuredObjectives: selectedTemplate.defaultObjectives,
      targetSkillIds: selectedTemplate.targetSkillIds,
      interpretedByAI: false,
      interpretationMode: 'manual',
      priority: customPriority,
      goalKind: customGoalKind,
      targetCompletionDate: customTargetDate.trim() || null,
    });
    navigate('assessment');
  };

  const handleApplyExplorerSkills = async () => {
    if (explorerSkillIds.length === 0) {
      setAiMessage('Select at least one skill from the Domain Explorer below to build a custom pathway.');
      return;
    }
    const domainName = activeDomain?.name ?? 'Custom Domain';
    const title = sanitizeTextInput(customGoalTitle, 120) || `${domainName} Mastery Pathway`;
    const validation = validateLearningGoalInput({
      title,
      domainId: activeDomain?.id,
      targetSkillIds: explorerSkillIds,
      targetCompletionDate: customTargetDate.trim() || null,
      existingGoals: snapshot.goals,
      profile: snapshot.profile,
      learnerSkills: snapshot.learnerSkills,
    });
    if (!validation.valid) {
      setAiMessage(validation.errors.join(' • '));
      return;
    }
    await selectOrCreateGoal({
      category: activeDomain?.id ?? 'custom',
      domainId: activeDomain?.id,
      title,
      rawDescription: `Learner-configured pathway in ${domainName} targeting ${explorerSkillIds.length} skill(s).`,
      structuredObjectives: explorerSkillIds.map(
        (id) => `Master ${defaultDomainRegistry.getSkill(id)?.name ?? id}`,
      ),
      targetSkillIds: explorerSkillIds,
      interpretedByAI: false,
      interpretationMode: 'manual',
      priority: customPriority,
      goalKind: customGoalKind,
      targetCompletionDate: customTargetDate.trim() || null,
    });
    navigate('assessment');
  };

  const handleInterpretFreeText = async () => {
    const clean = sanitizeTextInput(customGoalText, 1200);
    if (!clean) {
      setAiMessage('Enter a natural-language learning goal first.');
      return;
    }
    setAiMessage(null);
    const targetDateVal = customTargetDate.trim() || null;

    if (aiStatus.state === 'ready') {
      setAiBusy(true);
      setAiMessage('Interpreting via local Llama 3.2 & Zod validation...');
      try {
        const result = await advisoryService.interpretGoal(
          clean,
          allSkills.map((s) => s.slug),
        );
        if (result.ok) {
          const structured = mergeLlamaGoalInterpretation({
            rawGoalText: clean,
            llamaOutput: result.data,
            targetCompletionDate: targetDateVal,
            profile: snapshot.profile,
            learnerSkills: snapshot.learnerSkills,
          });
          setInterpretationPreview(structured);
          setAiMessage(
            `Validated local Llama 3.2 interpretation (${result.stats.totalTimeMs}ms). Review details & clarification prompts below before saving.`,
          );
          setAiBusy(false);
          return;
        }
        setAiMessage(
          `Local Llama output failed structured validation (${result.error}); showing deterministic catalogue fallback instead.`,
        );
      } catch (err) {
        setAiMessage(
          `${err instanceof Error ? err.message : 'Local Llama failed'}; showing deterministic catalogue fallback.`,
        );
      } finally {
        setAiBusy(false);
      }
    } else {
      setAiMessage(
        'Local Llama 3.2 is not initialized yet. Using transparent Deterministic Catalogue Fallback (never faking LLM inference).',
      );
    }

    const fallback = interpretGoalDeterministically({
      rawGoalText: clean,
      targetCompletionDate: targetDateVal,
      profile: snapshot.profile,
      learnerSkills: snapshot.learnerSkills,
    });
    setInterpretationPreview(fallback);
  };

  const handleSaveInterpretedGoal = async () => {
    if (!interpretationPreview) return;
    if (previewValidation && !previewValidation.valid) {
      setAiMessage(previewValidation.errors.join(' • '));
      return;
    }
    await selectOrCreateGoal({
      category: interpretationPreview.category,
      domainId: interpretationPreview.domainId ?? undefined,
      subjectId: interpretationPreview.subjectId ?? undefined,
      title: interpretationPreview.title,
      rawDescription: sanitizeTextInput(customGoalText, 1200) || interpretationPreview.rationale,
      structuredObjectives: interpretationPreview.structuredObjectives,
      targetSkillIds: interpretationPreview.targetSkillIds,
      interpretedByAI: interpretationPreview.interpretationSource === 'llm_local',
      interpretationMode: interpretationPreview.interpretationSource,
      priority: customPriority,
      goalKind: interpretationPreview.learningPurpose,
      horizon: interpretationPreview.horizon,
      targetCompletionDate: interpretationPreview.targetCompletionDate,
      expectedProficiency: interpretationPreview.expectedProficiencyLevel,
      learningPurpose: interpretationPreview.learningPurpose,
    });
    setInterpretationPreview(null);
    setCustomGoalText('');
    setAiMessage('Goal validated and saved. Navigating to diagnostic assessment...');
    navigate('assessment');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Multi-Goal Dashboard & Workload Prioritisation</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Manage multiple concurrent goals across any domain. Allocations stay strictly capped within your{' '}
              <strong>{goalPrioritization.weeklyCapacityHours}h/week</strong> study capacity.
            </p>
          </div>
          <span className="badge badge-info">
            Allocated: {goalPrioritization.totalAllocatedWeeklyHours} / {goalPrioritization.weeklyCapacityHours} hrs/wk
          </span>
        </div>

        {goalPrioritization.overloadWarning && (
          <div className="badge badge-warning" style={{ width: '100%', padding: 10, borderRadius: 8, marginTop: 12 }}>
            {goalPrioritization.overloadWarning}
          </div>
        )}

        {snapshot.goals.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', marginTop: 14, marginBottom: 0 }}>
            No goals created yet. Use Free-Text Interpretation, Universal Domain Explorer, or Goal Pathways below.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
            {snapshot.goals.map((g) => {
              const alloc = goalPrioritization.allocations.find((a) => a.goalId === g.id);
              const gStatus = g.status ?? (g.isActive ? 'active' : 'paused');
              const isFocused = g.id === (focusedGoalId ?? activeGoal?.id);
              return (
                <div
                  key={g.id}
                  className="card"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: isFocused ? '#6366F1' : 'var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <strong style={{ fontSize: 16 }}>
                        {isFocused ? '★ ' : ''}
                        {g.title}
                      </strong>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                        Status: <strong>{gStatus}</strong> • Priority: <strong>{g.priority ?? 'medium'}</strong> • Mode:{' '}
                        <strong>{g.interpretationMode ?? (g.interpretedByAI ? 'llm_local' : 'manual')}</strong> • Target:{' '}
                        {g.targetCompletionDate ?? 'Flexible'}
                      </div>
                    </div>
                    {alloc && (
                      <span className="badge badge-success">
                        {alloc.allocatedWeeklyHours}h/wk • {alloc.remainingHours}h left (~{alloc.estimatedWeeksAtAllocation}w)
                      </span>
                    )}
                  </div>

                  {alloc?.deadlineWarning && (
                    <div style={{ color: '#FBBF24', fontSize: 12.5, marginTop: 6 }}>{alloc.deadlineWarning}</div>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    <button
                      type="button"
                      className={`btn ${isFocused ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '5px 10px', fontSize: 12 }}
                      onClick={() => setFocusedGoalId(g.id)}
                    >
                      {isFocused ? 'Focused Roadmap' : 'Focus'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: 12 }}
                      onClick={() => changeGoalStatus(g.id, gStatus === 'active' ? 'paused' : 'active')}
                    >
                      {gStatus === 'active' ? 'Pause' : 'Resume'}
                    </button>
                    {gStatus !== 'completed' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => changeGoalStatus(g.id, 'completed', 'Marked completed')}
                      >
                        Complete
                      </button>
                    )}
                    {gStatus !== 'archived' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => changeGoalStatus(g.id, 'archived', 'Archived by learner')}
                      >
                        Archive
                      </button>
                    )}
                    {(['high', 'medium', 'low'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`btn ${g.priority === p ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '5px 8px', fontSize: 11.5 }}
                        onClick={() => changeGoalPriority(g.id, p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: 12 }}
                      onClick={() => {
                        setEditingGoalId(editingGoalId === g.id ? null : g.id);
                        setEditTitle(g.title);
                        setEditDate(g.targetCompletionDate ?? '');
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: 12 }}
                      onClick={() => setDetailGoalId(detailGoalId === g.id ? null : g.id)}
                    >
                      Details & History
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: 12, color: '#F87171' }}
                      onClick={() => deleteGoalSafely(g.id)}
                    >
                      Delete
                    </button>
                  </div>

                  {editingGoalId === g.id && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <input
                        className="input"
                        style={{ flex: 1, minWidth: 200 }}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Updated title"
                      />
                      <input
                        className="input"
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={async () => {
                          await updateGoalDetails(g.id, {
                            title: sanitizeTextInput(editTitle, 120) || g.title,
                            targetCompletionDate: editDate.trim() || null,
                          });
                          setEditingGoalId(null);
                        }}
                      >
                        Save Edit
                      </button>
                    </div>
                  )}

                  {detailGoalId === g.id && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', fontSize: 13 }}>
                      <div>
                        <strong>Objectives:</strong> {g.structuredObjectives.join(' • ')}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <strong>Target Skills:</strong> {g.targetSkillIds.join(', ')}
                      </div>
                      {g.history && g.history.length > 0 && (
                        <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--text-muted)' }}>
                          {g.history.map((h, idx) => (
                            <li key={idx}>
                              {new Date(h.timestamp).toLocaleString()} — {h.note} ({h.changedFields.join(', ')})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Sparkles size={18} color="#06B6D4" />
          <h2 style={{ margin: 0 }}>Natural-Language Goal Interpretation & Clarification</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
          Enter any learning goal in plain language. When Local Llama 3.2 is ready, LLM-assisted interpretation is used; otherwise an explicit deterministic catalogue fallback extracts structured scope and clarification questions.
        </p>

        <textarea
          className="textarea"
          rows={3}
          value={customGoalText}
          onChange={(e) => setCustomGoalText(e.target.value)}
          placeholder="e.g., Prepare for GATE ECE signals and circuits by March 2027, Learn Business Accounting & financial statements, Study Physics electromagnetism, or Prepare for UPSC..."
        />

        <div className="card-grid" style={{ marginTop: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, marginBottom: 4 }}>Goal Priority</label>
            <select
              className="select"
              value={customPriority}
              onChange={(e) => setCustomPriority(e.target.value as GoalPriority)}
            >
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, marginBottom: 4 }}>Learning Purpose</label>
            <select
              className="select"
              value={customGoalKind}
              onChange={(e) => setCustomGoalKind(e.target.value as GoalKind)}
            >
              <option value="academic">Academic</option>
              <option value="professional">Professional</option>
              <option value="examination">Examination</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, marginBottom: 4 }}>Target Date (Optional)</label>
            <input
              className="input"
              type="date"
              value={customTargetDate}
              onChange={(e) => setCustomTargetDate(e.target.value)}
            />
          </div>
        </div>

        {aiMessage && (
          <p style={{ color: 'var(--accent-cyan)', fontSize: 13.5, margin: '10px 0' }}>{aiMessage}</p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            disabled={aiBusy}
            onClick={handleInterpretFreeText}
          >
            {aiBusy
              ? 'Running Local Llama 3.2...'
              : aiStatus.state === 'ready'
                ? 'Interpret with Local Llama 3.2'
                : 'Analyze Goal (Deterministic Fallback)'}
          </button>
          {aiStatus.state !== 'ready' && (
            <button className="btn btn-secondary" onClick={() => navigate('model_settings')}>
              Initialize Local Llama (Optional)
            </button>
          )}
        </div>

        {interpretationPreview && (
          <div className="card" style={{ background: 'var(--bg-secondary)', marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0 }}>{interpretationPreview.title}</h3>
              <span
                className={`badge ${
                  interpretationPreview.interpretationSource === 'llm_local' ? 'badge-success' : 'badge-info'
                }`}
              >
                {interpretationPreview.interpretationSource === 'llm_local'
                  ? 'Local Llama 3.2 Output'
                  : 'Deterministic Catalogue Fallback'}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>
              <strong>Domain:</strong> {interpretationPreview.domainName} • <strong>Subject:</strong>{' '}
              {interpretationPreview.subjectName} • <strong>Proficiency:</strong>{' '}
              {interpretationPreview.expectedProficiencyLevel} • <strong>Purpose:</strong>{' '}
              {interpretationPreview.learningPurpose}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              <strong>Estimated Scope:</strong> {interpretationPreview.estimatedLearningScope.totalHours}h total (
              {interpretationPreview.estimatedLearningScope.prerequisiteHours}h prerequisites +{' '}
              {interpretationPreview.estimatedLearningScope.targetHours}h targets, ~
              {interpretationPreview.estimatedLearningScope.estimatedWeeks} week(s) at{' '}
              {interpretationPreview.estimatedLearningScope.weeklyCommitmentHours}h/wk)
            </p>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>Knowledge Assumptions:</strong> {interpretationPreview.currentKnowledgeAssumptions.join(' • ')}
            </div>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>Matched Target Skills:</strong>{' '}
              {interpretationPreview.targetSkillNames.join(', ') || 'None selected yet'}
            </div>

            {interpretationPreview.missingInformation.length > 0 && (
              <div className="badge badge-warning" style={{ width: '100%', padding: 10, borderRadius: 8, marginBottom: 10 }}>
                <strong>Clarification Needed:</strong> {interpretationPreview.missingInformation.join(' • ')}
              </div>
            )}

            {previewValidation && previewValidation.errors.length > 0 && (
              <div className="badge badge-danger" style={{ width: '100%', padding: 10, borderRadius: 8, marginBottom: 10 }}>
                {previewValidation.errors.join(' • ')}
              </div>
            )}

            {previewValidation && previewValidation.warnings.length > 0 && (
              <div style={{ color: '#FBBF24', fontSize: 13, marginBottom: 10 }}>
                {previewValidation.warnings.join(' • ')}
              </div>
            )}

            <button
              className="btn btn-primary"
              type="button"
              disabled={Boolean(previewValidation && !previewValidation.valid)}
              onClick={handleSaveInterpretedGoal}
            >
              Confirm & Create Goal Pathway
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Universal Goal Discovery & Domain Explorer ({allDomains.length} Domains)</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
          Choose a multi-domain pathway template or explore any of the {allDomains.length} universal domains directly.
        </p>

        <div className="card-grid" style={{ marginBottom: 20 }}>
          {GOAL_TEMPLATES.map((tpl) => {
            const active = tpl.category === selectedCategory;
            return (
              <button
                key={tpl.category}
                type="button"
                onClick={() => setSelectedCategory(tpl.category)}
                className="card"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderColor: active ? '#6366F1' : 'var(--border-subtle)',
                  background: active ? 'rgba(99,102,241,0.16)' : 'var(--bg-secondary)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#fff', marginBottom: 6 }}>{tpl.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tpl.description}</div>
              </button>
            );
          })}
        </div>

        <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>{selectedTemplate.title} — Objectives</h3>
          <ul style={{ color: 'var(--text-secondary)', paddingLeft: 20 }}>
            {selectedTemplate.defaultObjectives.map((obj, idx) => (
              <li key={idx}>{obj}</li>
            ))}
          </ul>
          <button className="btn btn-primary" onClick={handleApplyPredefined}>
            Add "{selectedTemplate.title}" & Take Diagnostic Assessment
          </button>
        </div>

        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Search size={18} color="#22D3EE" />
            <h3 style={{ margin: 0 }}>Search Any Domain, Subject, or Skill</h3>
          </div>
          <input
            className="input"
            value={domainSearch}
            onChange={(e) => setDomainSearch(e.target.value)}
            placeholder="Search any domain, subject, or skill (e.g., GATE ECE, Financial Accounting, Physics, UPSC, Law, Graphic Design, Python)..."
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {filteredDomains.map((dom) => {
              const selected = dom.id === activeDomain?.id;
              return (
                <button
                  key={dom.id}
                  type="button"
                  onClick={() => setSelectedDomainId(dom.id)}
                  className={`btn ${selected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  title={`${dom.summary} (Content: ${dom.contentStatus})`}
                >
                  {dom.name} ({dom.contentStatus})
                </button>
              );
            })}
          </div>
          {activeDomain && (
            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong>{activeDomain.name}</strong> — Status:{' '}
              <span className="badge badge-info">{activeDomain.contentStatus}</span>. {activeDomain.summary}
            </div>
          )}
          {searchResults.skills.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 6 }}>
                Select skills to build a personalized roadmap & prerequisite DAG:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {searchResults.skills.map((skill) => {
                  const chosen = explorerSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      className={`btn ${chosen ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: 12.5 }}
                      onClick={() =>
                        setExplorerSkillIds((prev) =>
                          prev.includes(skill.id) ? prev.filter((x) => x !== skill.id) : [...prev, skill.id],
                        )
                      }
                    >
                      {skill.name} ({skill.difficulty})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: 220 }}
              value={customGoalTitle}
              onChange={(e) => setCustomGoalTitle(e.target.value)}
              placeholder="Optional custom goal title (e.g., GATE ECE 2027 Preparation)"
            />
            <button className="btn btn-primary" type="button" onClick={handleApplyExplorerSkills}>
              Launch Selected Domain Skills ({explorerSkillIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
