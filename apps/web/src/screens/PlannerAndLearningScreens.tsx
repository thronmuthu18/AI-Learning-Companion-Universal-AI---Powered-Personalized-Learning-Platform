import React, { useMemo, useState } from 'react';
import type { CompletionStatus, StudyScheduleMode, StudySession, StudyTechnique } from '@alc/shared-types';
import { CORE_SKILLS } from '@alc/learning-engine';
import { BUNDLED_QUIZZES } from '@alc/resource-management';
import {
  canTransitionSessionStatus,
  getDailySessions,
  getMonthlyTargets,
  getWeeklyBuckets,
  type ScheduleRevisionPreview,
} from '@alc/study-planner';
import { sanitizeTextInput, validateSafeExternalUrl } from '@alc/validation';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Coffee,
  MessageSquare,
  PauseCircle,
  Play,
  Send,
  SkipForward,
  Sliders,
  Square,
} from 'lucide-react';
import { useApp } from '../state/AppContext';

const STATUS_LABEL: Record<CompletionStatus, string> = {
  not_started: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  partially_completed: 'Partial',
  skipped: 'Skipped',
  postponed: 'Postponed',
};

export const DailyPlannerScreen: React.FC = () => {
  const {
    activeSchedule,
    updateStudySessionLifecycle,
    recalculateMissedSchedule,
    previewMissedAndPostponedReschedule,
    applyScheduleOptions,
    navigate,
  } = useApp();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [technique, setTechnique] = useState<StudyTechnique>(
    () => activeSchedule?.studyTechnique ?? 'spaced_blocks',
  );
  const [scheduleMode, setScheduleMode] = useState<StudyScheduleMode>(
    () => activeSchedule?.scheduleMode ?? 'flexible',
  );
  const [includeBreaks, setIncludeBreaks] = useState(() => Boolean(activeSchedule?.breakConfig));
  const [preferredStartTime, setPreferredStartTime] = useState('18:00');
  const [unavailableDatesText, setUnavailableDatesText] = useState('');
  const [previewInfo, setPreviewInfo] = useState<ScheduleRevisionPreview | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [actualMinutesInput, setActualMinutesInput] = useState('');
  const [difficultyInput, setDifficultyInput] = useState<number>(3);

  if (!activeSchedule) {
    return (
      <div className="card">
        <h2>Daily Study Planner</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Activate a learning goal to generate your daily schedule.</p>
        <button className="btn btn-primary" onClick={() => navigate('goals')}>
          Select Learning Goal
        </button>
      </div>
    );
  }

  const dailySessions = getDailySessions(activeSchedule.sessions, selectedDate);
  const availableDates = Array.from(new Set(activeSchedule.sessions.map((s) => s.dateISO))).slice(0, 14);
  const parsedUnavailableDates = unavailableDatesText
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));

  const openSessionEditor = (s: StudySession) => {
    setEditingSessionId(s.id);
    setNotesInput(s.notes ?? '');
    setActualMinutesInput(String(s.actualMinutes > 0 ? s.actualMinutes : s.plannedMinutes));
    setDifficultyInput(s.difficultyRating ?? 3);
  };

  const handleLifecycleTransition = async (s: StudySession, nextStatus: CompletionStatus) => {
    const isEditing = editingSessionId === s.id;
    const parsedMinutes = isEditing ? Number(actualMinutesInput) : undefined;
    await updateStudySessionLifecycle(s, nextStatus, {
      actualMinutes:
        parsedMinutes !== undefined && Number.isFinite(parsedMinutes) && parsedMinutes >= 0
          ? parsedMinutes
          : undefined,
      notes: isEditing ? sanitizeTextInput(notesInput, 300) : undefined,
      difficultyRating: isEditing ? difficultyInput : undefined,
    });
    if (isEditing) setEditingSessionId(null);
  };

  const handlePreviewReschedule = () => {
    const res = previewMissedAndPostponedReschedule({
      unavailableDatesISO: parsedUnavailableDates,
      preferredStartTimeHHMM: preferredStartTime,
    });
    setPreviewInfo(res ? res.preview : null);
  };

  const handleApplyReschedule = async () => {
    await recalculateMissedSchedule({
      unavailableDatesISO: parsedUnavailableDates,
      preferredStartTimeHHMM: preferredStartTime,
    });
    setPreviewInfo(null);
  };

  const handleApplyRoutineSettings = async () => {
    await applyScheduleOptions({
      studyTechnique: technique,
      scheduleMode,
      includeBreaks,
      preferredStartTimeHHMM: preferredStartTime,
      unavailableDatesISO: parsedUnavailableDates,
    });
    setPreviewInfo(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Daily Study Planner</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
              Daily Budget: {activeSchedule.dailyAvailableMinutes} min/day • Total Planned: {activeSchedule.totalPlannedHours}h • Mode: {activeSchedule.scheduleMode ?? 'flexible'} ({activeSchedule.studyTechnique ?? 'spaced_blocks'})
            </p>
            {activeSchedule.schedulingSummary && (
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
                {activeSchedule.schedulingSummary}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="date"
              className="input"
              style={{ width: 'auto' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={handlePreviewReschedule}>
              Preview Adaptive Reschedule
            </button>
            <button className="btn btn-primary" onClick={handleApplyReschedule}>
              Reschedule Missed & Postponed
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 10,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <label className="field-label" style={{ fontSize: 12 }}>
              <Sliders size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Study Technique
            </label>
            <select
              className="input"
              value={technique}
              onChange={(e) => setTechnique(e.target.value as StudyTechnique)}
            >
              <option value="spaced_blocks">Spaced Blocks (45m)</option>
              <option value="pomodoro">Pomodoro (25m)</option>
              <option value="deep_focus">Deep Focus (75m)</option>
            </select>
          </div>
          <div>
            <label className="field-label" style={{ fontSize: 12 }}>Schedule Flexibility</label>
            <select
              className="input"
              value={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.value as StudyScheduleMode)}
            >
              <option value="flexible">Flexible</option>
              <option value="fixed">Fixed Timetable</option>
            </select>
          </div>
          <div>
            <label className="field-label" style={{ fontSize: 12 }}>Preferred Start Window</label>
            <input
              type="time"
              className="input"
              value={preferredStartTime}
              onChange={(e) => setPreferredStartTime(e.target.value)}
            />
          </div>
          <div style={{ minWidth: 200, flex: 1 }}>
            <label className="field-label" style={{ fontSize: 12 }}>Unavailable Blackout Dates (YYYY-MM-DD, comma-separated)</label>
            <input
              className="input"
              placeholder="e.g. 2026-12-01, 2026-12-05"
              value={unavailableDatesText}
              onChange={(e) => setUnavailableDatesText(e.target.value)}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, paddingBottom: 8 }}>
            <input
              type="checkbox"
              checked={includeBreaks}
              onChange={(e) => setIncludeBreaks(e.target.checked)}
            />
            Include Breaks
          </label>
          <button className="btn btn-secondary" onClick={handleApplyRoutineSettings}>
            Apply Routine Settings
          </button>
        </div>

        {previewInfo && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 10,
              background: 'rgba(6,182,212,0.1)',
              border: '1px solid rgba(6,182,212,0.35)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <strong>Adaptive Reschedule Preview</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                {previewInfo.summary}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setPreviewInfo(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleApplyReschedule}>
                Confirm Revision
              </button>
            </div>
          </div>
        )}

        {!activeSchedule.isRealistic && activeSchedule.feasibilityWarning && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 10,
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.35)',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <AlertTriangle size={18} color="#F59E0B" />
            <span style={{ fontSize: 13.5 }}>{activeSchedule.feasibilityWarning}</span>
          </div>
        )}

        {(activeSchedule.conflicts ?? []).length > 0 && (
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            {activeSchedule.conflicts!.slice(0, 3).map((c, idx) => (
              <div key={`${c.dateISO}_${idx}`} style={{ fontSize: 12.5, color: '#F59E0B' }}>
                • [{c.dateISO}] {c.reason}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {availableDates.map((d) => (
            <button
              key={d}
              className={`btn ${d === selectedDate ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 10px', fontSize: 12 }}
              onClick={() => setSelectedDate(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Sessions for {selectedDate}</h3>
        {dailySessions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No study sessions scheduled for {selectedDate}.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {dailySessions.map((s) => {
              const isBreak = s.sessionType === 'break';
              const isEditing = editingSessionId === s.id;
              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 14,
                    borderRadius: 12,
                    background: isBreak ? 'rgba(16,185,129,0.06)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="badge badge-info">
                          {isBreak && <Coffee size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                          {s.sessionType}
                        </span>
                        <span className="badge badge-secondary">{STATUS_LABEL[s.status]}</span>
                        {s.startTimeHHMM && s.endTimeHHMM && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                            {s.startTimeHHMM}–{s.endTimeHHMM}
                          </span>
                        )}
                        <strong>{s.title}</strong>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        Planned: {s.plannedMinutes} min
                        {s.actualMinutes > 0 ? ` • Actual: ${s.actualMinutes} min` : ''}
                        {s.difficultyRating ? ` • Difficulty: ${s.difficultyRating}/5` : ''}
                        {s.notes ? ` • Note: ${s.notes}` : ''}
                      </div>
                      {s.scheduleReason && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                          Why scheduled: {s.scheduleReason}
                        </div>
                      )}
                    </div>

                    {!isBreak && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {s.status === 'not_started' && canTransitionSessionStatus(s.status, 'in_progress') && (
                          <button className="btn btn-secondary" onClick={() => handleLifecycleTransition(s, 'in_progress')}>
                            <Play size={14} /> Start
                          </button>
                        )}
                        {canTransitionSessionStatus(s.status, 'partially_completed') && s.status !== 'partially_completed' && (
                          <button className="btn btn-secondary" onClick={() => handleLifecycleTransition(s, 'partially_completed')}>
                            Partial
                          </button>
                        )}
                        {canTransitionSessionStatus(s.status, 'completed') && s.status !== 'completed' && (
                          <button className="btn btn-primary" onClick={() => handleLifecycleTransition(s, 'completed')}>
                            <CheckCircle2 size={14} /> Complete
                          </button>
                        )}
                        {canTransitionSessionStatus(s.status, 'postponed') && s.status !== 'postponed' && s.status !== 'completed' && (
                          <button className="btn btn-secondary" onClick={() => handleLifecycleTransition(s, 'postponed')}>
                            <PauseCircle size={14} /> Postpone
                          </button>
                        )}
                        {canTransitionSessionStatus(s.status, 'skipped') && s.status !== 'skipped' && s.status !== 'completed' && (
                          <button className="btn btn-secondary" onClick={() => handleLifecycleTransition(s, 'skipped')}>
                            <SkipForward size={14} /> Skip
                          </button>
                        )}
                        {s.status === 'completed' && (
                          <button className="btn btn-secondary" onClick={() => handleLifecycleTransition(s, 'not_started')}>
                            Reopen
                          </button>
                        )}
                        <button className="btn btn-secondary" onClick={() => (isEditing ? setEditingSessionId(null) : openSessionEditor(s))}>
                          {isEditing ? 'Close Log' : 'Log Details'}
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && !isBreak && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        flexWrap: 'wrap',
                        paddingTop: 8,
                        borderTop: '1px solid var(--border-subtle)',
                        alignItems: 'flex-end',
                      }}
                    >
                      <div style={{ width: 120 }}>
                        <label className="field-label" style={{ fontSize: 12 }}>Actual Min</label>
                        <input
                          type="number"
                          min={0}
                          max={480}
                          className="input"
                          value={actualMinutesInput}
                          onChange={(e) => setActualMinutesInput(e.target.value)}
                        />
                      </div>
                      <div style={{ width: 130 }}>
                        <label className="field-label" style={{ fontSize: 12 }}>Difficulty (1–5)</label>
                        <select
                          className="input"
                          value={difficultyInput}
                          onChange={(e) => setDifficultyInput(Number(e.target.value))}
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n} / 5</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <label className="field-label" style={{ fontSize: 12 }}>Session Reflection / Notes</label>
                        <input
                          className="input"
                          placeholder="What went well or felt challenging?"
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                        />
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleLifecycleTransition(s, s.status === 'not_started' ? 'completed' : s.status)}
                      >
                        Save Session Log
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const WeeklyPlannerScreen: React.FC = () => {
  const { activeSchedule, navigate } = useApp();
  const buckets = useMemo(
    () => (activeSchedule ? getWeeklyBuckets(activeSchedule.sessions) : []),
    [activeSchedule],
  );

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Weekly Study Schedules</h2>
          {activeSchedule?.schedulingSummary && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              {activeSchedule.schedulingSummary}
            </p>
          )}
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('daily_planner')}>
          Back to Daily Planner
        </button>
      </div>
      {buckets.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No weekly sessions scheduled yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {buckets.map((w) => {
            const pct = w.totalMinutes > 0 ? Math.round((w.completedMinutes / w.totalMinutes) * 100) : 0;
            const completedCount = w.sessions.filter((s) => s.status === 'completed').length;
            const studyCount = w.sessions.filter((s) => s.sessionType !== 'break').length;
            return (
              <div key={w.weekStartISO} className="card" style={{ background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>
                    <Calendar size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Week of {w.weekStartISO} to {w.weekEndISO}
                  </strong>
                  <span className="badge badge-info">
                    {(w.completedMinutes / 60).toFixed(1)}h / {(w.totalMinutes / 60).toFixed(1)}h ({pct}%)
                  </span>
                </div>
                <div className="progress-track" style={{ margin: '10px 0' }}>
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {studyCount} study sessions ({completedCount} completed) • Remaining: {Math.max(0, Math.round((w.totalMinutes - w.completedMinutes) / 60 * 10) / 10)}h
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const MonthlyTargetsScreen: React.FC = () => {
  const { activeSchedule } = useApp();
  const months = useMemo(
    () => (activeSchedule ? getMonthlyTargets(activeSchedule.sessions) : []),
    [activeSchedule],
  );

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Monthly Study Targets</h2>
      {months.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No monthly targets generated yet.</p>
      ) : (
        <div className="card-grid">
          {months.map((m) => (
            <div key={m.monthKey} className="card" style={{ background: 'var(--bg-secondary)' }}>
              <h3 style={{ marginTop: 0 }}>{m.monthKey}</h3>
              <p style={{ margin: '6px 0', color: 'var(--text-secondary)' }}>
                Hours: <strong>{m.completedHours}h</strong> / {m.totalPlannedHours}h
              </p>
              <p style={{ margin: '6px 0', color: 'var(--text-secondary)' }}>
                Sessions: <strong>{m.completedCount}</strong> / {m.sessionsCount}
              </p>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                Focus Skills: {m.focusSkills.join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const LearningLibraryScreen: React.FC = () => {
  const {
    allResources,
    setSelectedResourceId,
    addUserResource,
    toggleOfflineDownloadResource,
    isOnline,
    navigate,
  } = useApp();
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'bundled' | 'user_imported' | 'optional_external'>('all');
  const [title, setTitle] = useState('');
  const [skillId, setSkillId] = useState(CORE_SKILLS[0]!.id);
  const [markdown, setMarkdown] = useState('');

  const filtered = allResources.filter((r) =>
    filterOrigin === 'all' ? true : r.origin === filterOrigin,
  );

  const handleImportNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = sanitizeTextInput(title, 120);
    const cleanBody = sanitizeTextInput(markdown, 8000);
    if (!cleanTitle || !cleanBody) return;
    await addUserResource({
      skillId,
      title: cleanTitle,
      summary: cleanBody.slice(0, 120),
      contentMarkdown: cleanBody,
      codeExample: null,
      practicePrompt: null,
      externalUrl: null,
      estimatedMinutes: 20,
      difficulty: 'intermediate',
    });
    setTitle('');
    setMarkdown('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>Offline Learning Library</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
              Clearly separates Bundled Offline Content, User-Imported Notes, and Optional Online Documentation.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['all', 'bundled', 'user_imported', 'optional_external'] as const).map((tab) => (
              <button
                key={tab}
                className={`btn ${filterOrigin === tab ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: 12.5 }}
                onClick={() => setFilterOrigin(tab)}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card-grid">
        {filtered.map((res) => (
          <div key={res.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <span className={`badge ${res.origin === 'optional_external' ? 'badge-warning' : 'badge-success'}`}>
                  {res.origin}
                </span>
                <span className="badge badge-info">{res.estimatedMinutes}m</span>
              </div>
              <h3 style={{ margin: '4px 0 6px', fontSize: 16 }}>{res.title}</h3>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)' }}>{res.summary}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setSelectedResourceId(res.id);
                  navigate('content_viewer');
                }}
              >
                <BookOpen size={15} /> Open Lesson
              </button>
              {res.origin === 'optional_external' && res.externalUrl && validateSafeExternalUrl(res.externalUrl) && (
                <a
                  href={isOnline ? res.externalUrl : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  onClick={(e) => {
                    if (!isOnline) {
                      e.preventDefault();
                      toggleOfflineDownloadResource(res.id);
                    }
                  }}
                >
                  {isOnline ? 'Open Docs' : 'Offline'}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Import Personal Study Material (Saved Locally)</h3>
        <form onSubmit={handleImportNote} style={{ display: 'grid', gap: 12 }}>
          <div className="card-grid">
            <input
              className="input"
              placeholder="Note / Guide Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select className="select" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
              {CORE_SKILLS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="textarea"
            rows={4}
            placeholder="Paste Markdown study notes, exercises, or revision summaries..."
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" style={{ width: 'fit-content' }}>
            Save to Offline Library
          </button>
        </form>
      </div>
    </div>
  );
};

export const ContentViewerScreen: React.FC = () => {
  const { allResources, selectedResourceId, setSelectedQuizId, navigate } = useApp();
  const resource = allResources.find((r) => r.id === selectedResourceId) ?? allResources[0];

  if (!resource) {
    return (
      <div className="card">
        <h2>Content Viewer</h2>
        <button className="btn btn-primary" onClick={() => navigate('library')}>
          Browse Library
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span className="badge badge-info">
          {resource.origin} • {resource.difficulty} • {resource.estimatedMinutes} min
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('library')}>
            Back to Library
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              const matchingQuiz = BUNDLED_QUIZZES.find((q) => q.skillId === resource.skillId);
              if (matchingQuiz) setSelectedQuizId(matchingQuiz.id);
              navigate('quiz');
            }}
          >
            Take Practice Quiz
          </button>
        </div>
      </div>

      <h2 style={{ marginTop: 14 }}>{resource.title}</h2>
      <p style={{ color: 'var(--text-secondary)' }}>{resource.summary}</p>
      <pre className="code-block" style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
        {resource.contentMarkdown}
      </pre>

      {resource.codeExample && (
        <>
          <h3>Code Reference</h3>
          <pre className="code-block">{resource.codeExample}</pre>
        </>
      )}

      {resource.practicePrompt && (
        <div className="card" style={{ background: 'var(--bg-secondary)', marginTop: 16 }}>
          <h4 style={{ margin: '0 0 6px' }}>Hands-On Exercise</h4>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{resource.practicePrompt}</p>
        </div>
      )}
    </div>
  );
};

export const AIAssistantScreen: React.FC = () => {
  const { advisoryService, provider, aiStatus, activeGoal, skillGap, navigate } = useApp();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant' | 'error'; text: string; meta?: string }>>([]);
  const [streaming, setStreaming] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeTextInput(question, 2000);
    if (!clean || streaming) return;

    if (aiStatus.state !== 'ready') {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: clean },
        {
          role: 'error',
          text: 'Local Llama 3.2 WebGPU model is not initialized yet. Remote AI fallbacks are strictly disabled. Open Offline Model Settings to load Llama 3.2 1B locally.',
        },
      ]);
      setQuestion('');
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', text: clean }, { role: 'assistant', text: '' }]);
    setQuestion('');
    setStreaming(true);

    const contextSummary = `Active Goal: ${activeGoal?.title ?? 'None'}\nWeak Skills: ${skillGap.weakSkills.map((s) => s.name).join(', ') || 'None'}\nMissing Skills: ${skillGap.missingSkills.map((s) => s.name).join(', ') || 'None'}`;

    try {
      const response = await advisoryService.askTutorStream(contextSummary, clean, (_tok, acc) => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', text: acc };
          return copy;
        });
      });

      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: 'assistant',
          text: response.text,
          meta: `${response.modelId} • ${response.stats.totalTimeMs}ms • ${response.stats.decodeTokensPerSec ?? '-'} tok/s`,
        };
        return copy;
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'error', text: err instanceof Error ? err.message : 'Local inference failed.' },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0 }}>
            <MessageSquare size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Local Llama 3.2 Learning Assistant
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
            Status: <strong>{aiStatus.state}</strong> — {aiStatus.statusMessage}
          </p>
        </div>
        {aiStatus.state !== 'ready' && (
          <button className="btn btn-primary" onClick={() => navigate('model_settings')}>
            Load Llama 3.2 Model
          </button>
        )}
      </div>

      <div
        style={{
          minHeight: 320,
          maxHeight: 480,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 14,
          borderRadius: 12,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 'auto' }}>
            Ask a concept question, request a code explanation, or ask for revision guidance—executed locally via WebGPU.
          </p>
        ) : (
          messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: 12,
                borderRadius: 12,
                background:
                  m.role === 'user'
                    ? 'rgba(99,102,241,0.24)'
                    : m.role === 'error'
                      ? 'rgba(239,68,68,0.16)'
                      : 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{m.text}</div>
              {m.meta && (
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>{m.meta}</div>
              )}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 10 }}>
        <input
          className="input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your offline Llama 3.2 tutor..."
        />
        {streaming ? (
          <button type="button" className="btn btn-danger" onClick={() => provider.cancel()}>
            <Square size={15} /> Stop
          </button>
        ) : (
          <button type="submit" className="btn btn-primary">
            <Send size={15} /> Send
          </button>
        )}
      </form>
    </div>
  );
};

export const QuizInterfaceScreen: React.FC = () => {
  const { selectedQuizId, setSelectedQuizId, submitQuiz, navigate } = useApp();
  const quiz = BUNDLED_QUIZZES.find((q) => q.id === selectedQuizId) ?? BUNDLED_QUIZZES[0]!;
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const handleSubmit = async () => {
    await submitQuiz(quiz.id, selectedAnswers);
    navigate('quiz_results');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Topic & Difficulty Quiz</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {BUNDLED_QUIZZES.map((q) => (
            <button
              key={q.id}
              className={`btn ${q.id === quiz.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 13 }}
              onClick={() => {
                setSelectedQuizId(q.id);
                setSelectedAnswers({});
              }}
            >
              {q.title}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>{quiz.title}</h3>
          <span className="badge badge-info">{quiz.difficulty}</span>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="card" style={{ background: 'var(--bg-secondary)' }}>
              <p style={{ marginTop: 0, fontWeight: 600 }}>
                Q{idx + 1}. {q.prompt}
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {q.options.map((opt, optIdx) => {
                  const chosen = selectedAnswers[q.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      className={`btn ${chosen ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                      onClick={() => setSelectedAnswers((p) => ({ ...p, [q.id]: optIdx }))}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={handleSubmit}>
          Evaluate Quiz & Persist Result
        </button>
      </div>
    </div>
  );
};

export const QuizResultsScreen: React.FC = () => {
  const { lastQuizAttempt, snapshot, navigate } = useApp();
  const attempt = lastQuizAttempt ?? snapshot.quizAttempts.at(-1) ?? null;

  if (!attempt) {
    return (
      <div className="card">
        <h2>Quiz Results</h2>
        <p style={{ color: 'var(--text-secondary)' }}>No quiz attempts yet.</p>
        <button className="btn btn-primary" onClick={() => navigate('quiz')}>
          Take a Quiz
        </button>
      </div>
    );
  }

  const quiz = BUNDLED_QUIZZES.find((q) => q.id === attempt.quizId);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Quiz Evaluation & Explanations</h2>
      <div className="card-grid" style={{ marginBottom: 18 }}>
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Score</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: attempt.scorePercent >= 75 ? '#10B981' : '#F59E0B' }}>
            {attempt.scorePercent}%
          </div>
        </div>
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Accuracy</div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>
            {attempt.correctCount} / {attempt.totalQuestions}
          </div>
        </div>
      </div>

      {quiz && (
        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          {quiz.questions.map((q) => {
            const ans = attempt.answers.find((a) => a.questionId === q.id);
            return (
              <div key={q.id} className="card" style={{ background: 'var(--bg-secondary)' }}>
                <strong>{q.prompt}</strong>
                <p style={{ margin: '6px 0', color: ans?.isCorrect ? '#6ee7b7' : '#fca5a5', fontSize: 13.5 }}>
                  {ans?.isCorrect ? 'Correct' : `Incorrect — Correct option: ${q.options[q.correctOptionIndex]}`}
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13.5 }}>{q.explanation}</p>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={() => navigate('quiz')}>
          Retake Quiz
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('recommendations')}>
          View Adaptive Recommendations
        </button>
      </div>
    </div>
  );
};
