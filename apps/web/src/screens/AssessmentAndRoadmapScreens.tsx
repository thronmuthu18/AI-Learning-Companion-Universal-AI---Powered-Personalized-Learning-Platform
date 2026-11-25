import React, { useEffect, useMemo, useState } from 'react';
import type { SubmittedQuestionResponse } from '@alc/assessment-engine';
import { defaultDomainRegistry, type RoadmapRegenerationPreview } from '@alc/learning-engine';
import { getWeeklyBuckets } from '@alc/study-planner';
import { AlertTriangle, CheckCircle2, Clock, Save, ShieldAlert, Sparkles, XCircle } from 'lucide-react';
import { useApp } from '../state/AppContext';

const DRAFT_STORAGE_KEY = 'alc_universal_assessment_draft_v1';

interface LocalAnswerDraft {
  selectedOptionIndex: number;
  selectedOptionIndices: number[];
  numericInput: string;
  unitInput: string;
  textInput: string;
  confidenceRating: number;
  timeSpentSeconds: number;
}

export const SkillAssessmentScreen: React.FC = () => {
  const {
    activeGoal,
    activeDiagnosticAssessment,
    activeDiagnosticQuestions,
    assessmentHistorySummary,
    submitDiagnosticAssessment,
    navigate,
  } = useApp();

  const questions = activeDiagnosticQuestions;
  const [phase, setPhase] = useState<'intro' | 'active' | 'confirm'>('intro');
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [questionStartMs, setQuestionStartMs] = useState(() => Date.now());
  const [elapsedTickerSec, setElapsedTickerSec] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flashcardRevealed, setFlashcardRevealed] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, LocalAnswerDraft>>({});
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState(() => {
    try {
      return Boolean(localStorage.getItem(DRAFT_STORAGE_KEY));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (phase !== 'active') return;
    setQuestionStartMs(Date.now());
    const id = setInterval(() => {
      setElapsedTickerSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [phase, currentIdx]);

  const currentQ = questions[currentIdx] ?? questions[0]!;
  const qType = currentQ.questionType ?? 'mcq';
  const currentResp: LocalAnswerDraft = answers[currentQ.id] ?? {
    selectedOptionIndex: -1,
    selectedOptionIndices: [],
    numericInput: '',
    unitInput: '',
    textInput: '',
    confidenceRating: 3,
    timeSpentSeconds: 0,
  };

  const patchCurrentAnswer = (patch: Partial<LocalAnswerDraft>) => {
    const delta = Math.max(1, Math.round((Date.now() - questionStartMs) / 1000));
    setAnswers((prev) => {
      const existing = prev[currentQ.id] ?? currentResp;
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          ...patch,
          timeSpentSeconds: (prev[currentQ.id]?.timeSpentSeconds ?? 0) + delta,
        },
      };
    });
    setQuestionStartMs(Date.now());
  };

  const isQuestionAnswered = (qId: string, type: string | undefined): boolean => {
    const a = answers[qId];
    if (!a) return false;
    if (type === 'numerical') return a.numericInput.trim().length > 0 && Number.isFinite(Number(a.numericInput));
    if (type === 'multiple_select') return a.selectedOptionIndices.length > 0;
    if (type === 'descriptive' || type === 'short_answer' || type === 'case_study' || type === 'practical' || type === 'coding') {
      return a.textInput.trim().length > 0;
    }
    return a.selectedOptionIndex >= 0;
  };

  const answeredCount = questions.filter((q) => isQuestionAnswered(q.id, q.questionType)).length;

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          assessmentId: activeDiagnosticAssessment.id,
          startedAt,
          currentIdx,
          answers,
          savedAt: new Date().toISOString(),
        }),
      );
      setHasSavedDraft(true);
      setDraftNotice('Progress saved locally offline. You can safely close or resume anytime.');
    } catch {
      setDraftNotice('Unable to persist draft in browser storage.');
    }
  };

  const handleResumeDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.startedAt) setStartedAt(parsed.startedAt);
      if (parsed.answers) setAnswers(parsed.answers);
      if (typeof parsed.currentIdx === 'number') {
        setCurrentIdx(Math.min(questions.length - 1, Math.max(0, parsed.currentIdx)));
      }
      setPhase('active');
    } catch {
      setPhase('active');
    }
  };

  const handleSubmit = async () => {
    const responses: SubmittedQuestionResponse[] = questions.map((q) => {
      const a = answers[q.id];
      const numericVal =
        a && a.numericInput.trim() !== '' && Number.isFinite(Number(a.numericInput))
          ? Number(a.numericInput)
          : null;
      return {
        questionId: q.id,
        selectedOptionIndex: a?.selectedOptionIndex ?? -1,
        selectedOptionIndices: a?.selectedOptionIndices ?? [],
        numericAnswer: numericVal,
        unitAnswer: a?.unitInput.trim() || null,
        textAnswer: a?.textInput.trim() || null,
        confidenceRating: a?.confidenceRating ?? 3,
        timeSpentSeconds: Math.max(2, a?.timeSpentSeconds ?? 15),
      };
    });
    await submitDiagnosticAssessment(responses, startedAt, activeDiagnosticAssessment, questions);
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
    navigate('assessment_results');
  };

  const modalitySummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of questions) {
      const t = q.questionType ?? 'mcq';
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([k, v]) => `${k.replace('_', ' ')} (${v})`)
      .join(' • ');
  }, [questions]);

  if (phase === 'intro') {
    return (
      <div className="card">
        <span className="badge badge-info">Universal Diagnostic & Multi-Modal Assessment</span>
        <h2 style={{ margin: '10px 0 6px' }}>{activeDiagnosticAssessment.title}</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
          Evaluates demonstrated skill proficiency using objective checks, numerical tolerance + unit checks, multi-select items, coding specs, practical rubrics, and flashcards—never equating confidence alone with mastery.
        </p>

        <div className="card-grid" style={{ marginBottom: 18 }}>
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Active Goal Scope</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>{activeGoal?.title ?? 'Multi-Domain Baseline'}</div>
          </div>
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Question Mix ({questions.length} items)</div>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 4 }}>{modalitySummary}</div>
          </div>
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Prior Attempts</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>
              {assessmentHistorySummary.totalAttempts} recorded
              {assessmentHistorySummary.latestScorePercent !== null
                ? ` (Latest: ${assessmentHistorySummary.latestScorePercent}%)`
                : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setStartedAt(new Date().toISOString());
              setElapsedTickerSec(0);
              setPhase('active');
            }}
          >
            Start Diagnostic Assessment
          </button>
          {hasSavedDraft && (
            <button className="btn btn-secondary" onClick={handleResumeDraft}>
              Resume Saved Offline Draft
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'confirm') {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Confirm Diagnostic Submission</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          You answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions in{' '}
          <strong>{elapsedTickerSec}s</strong>. Unanswered items will count as unattempted/0% until reassessed.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setPhase('active')}>
            Return to Questions
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Confirm & Grade Offline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <span className="badge badge-info">
            {qType.replace('_', ' ').toUpperCase()} • {currentQ.difficulty.toUpperCase()}
          </span>
          <h2 style={{ margin: '8px 0 4px' }}>
            Question {currentIdx + 1} of {questions.length}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-warning">
            <Clock size={14} /> {answeredCount}/{questions.length} answered • {elapsedTickerSec}s
          </span>
          <button type="button" className="btn btn-secondary" onClick={handleSaveDraft}>
            <Save size={14} /> Save & Resume Later
          </button>
        </div>
      </div>

      {draftNotice && (
        <p style={{ color: '#22D3EE', fontSize: 13, marginTop: 8 }}>{draftNotice}</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0' }}>
        {questions.map((q, i) => {
          const done = isQuestionAnswered(q.id, q.questionType);
          const current = i === currentIdx;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIdx(i)}
              className={`btn ${current ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                borderColor: done ? '#10B981' : undefined,
              }}
              aria-label={`Jump to question ${i + 1}`}
            >
              {i + 1}
              {done ? '✓' : ''}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 17.5, fontWeight: 600, marginBottom: 16 }}>{currentQ.prompt}</p>

      {(qType === 'mcq' || qType === 'conceptual' || qType === 'scenario') && (
        <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
          {currentQ.options.map((opt, idx) => {
            const selected = currentResp.selectedOptionIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                className="btn"
                style={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  padding: '14px 16px',
                  background: selected ? 'rgba(99,102,241,0.22)' : 'var(--bg-secondary)',
                  borderColor: selected ? '#6366F1' : 'var(--border-subtle)',
                  color: '#fff',
                }}
                onClick={() => patchCurrentAnswer({ selectedOptionIndex: idx })}
              >
                <strong style={{ minWidth: 24 }}>{String.fromCharCode(65 + idx)}.</strong> {opt}
              </button>
            );
          })}
        </div>
      )}

      {qType === 'multiple_select' && (
        <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Select all that apply:</div>
          {currentQ.options.map((opt, idx) => {
            const selected = currentResp.selectedOptionIndices.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                className="btn"
                style={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  padding: '12px 16px',
                  background: selected ? 'rgba(34,211,238,0.18)' : 'var(--bg-secondary)',
                  borderColor: selected ? '#22D3EE' : 'var(--border-subtle)',
                  color: '#fff',
                }}
                onClick={() => {
                  const next = selected
                    ? currentResp.selectedOptionIndices.filter((x) => x !== idx)
                    : [...currentResp.selectedOptionIndices, idx];
                  patchCurrentAnswer({ selectedOptionIndices: next });
                }}
              >
                <strong style={{ minWidth: 24 }}>{selected ? '[✓]' : '[ ]'}</strong> {opt}
              </button>
            );
          })}
        </div>
      )}

      {qType === 'numerical' && (
        <div className="card-grid" style={{ marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Numeric Answer</label>
            <input
              className="input"
              type="number"
              step="any"
              value={currentResp.numericInput}
              onChange={(e) => patchCurrentAnswer({ numericInput: e.target.value })}
              placeholder="Enter numeric value..."
            />
          </div>
          {currentQ.expectedUnit && (
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
                Unit (Expected e.g., {currentQ.expectedUnit})
              </label>
              <input
                className="input"
                value={currentResp.unitInput}
                onChange={(e) => patchCurrentAnswer({ unitInput: e.target.value })}
                placeholder={`Unit (${currentQ.expectedUnit})`}
              />
            </div>
          )}
        </div>
      )}

      {(qType === 'descriptive' || qType === 'short_answer' || qType === 'case_study' || qType === 'practical' || qType === 'coding') && (
        <div style={{ marginBottom: 20 }}>
          {currentQ.rubricCriteria && currentQ.rubricCriteria.length > 0 && (
            <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Evaluation Rubric</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                {currentQ.rubricCriteria.map((c) => (
                  <li key={c.id}>
                    {c.description} ({c.maxPoints} pts)
                  </li>
                ))}
              </ul>
            </div>
          )}
          {currentQ.codingTestCases && currentQ.codingTestCases.length > 0 && (
            <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                Static Safety Checks (Zero untrusted code execution in app process)
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                {currentQ.codingTestCases.map((tc) => (
                  <li key={tc.id}>{tc.description}</li>
                ))}
              </ul>
            </div>
          )}
          <textarea
            className="textarea"
            rows={5}
            style={{ fontFamily: qType === 'coding' ? 'monospace' : undefined }}
            value={currentResp.textInput}
            onChange={(e) => patchCurrentAnswer({ textInput: e.target.value })}
            placeholder={qType === 'coding' ? 'Write solution code here...' : 'Write clear structured answer covering rubric criteria...'}
          />
        </div>
      )}

      {qType === 'flashcard' && (
        <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              setFlashcardRevealed((p) => ({ ...p, [currentQ.id]: !p[currentQ.id] }))
            }
          >
            {flashcardRevealed[currentQ.id] ? 'Hide Reference Answer' : 'Reveal Reference Answer'}
          </button>
          {flashcardRevealed[currentQ.id] && currentQ.referenceAnswer && (
            <p style={{ marginTop: 10, color: '#22D3EE', fontSize: 14 }}>{currentQ.referenceAnswer}</p>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                className={`btn ${currentResp.selectedOptionIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => patchCurrentAnswer({ selectedOptionIndex: idx })}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
          Self-Reported Confidence (1 = Guessing, 5 = Certain) — Tracked Separately from Score
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`btn ${currentResp.confidenceRating === lvl ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => patchCurrentAnswer({ confidenceRating: lvl })}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button
          className="btn btn-secondary"
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
        >
          Previous
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          {currentIdx < questions.length - 1 && (
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
            >
              Next Question
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setPhase('confirm')}>
            Review & Submit Diagnostic
          </button>
        </div>
      </div>
    </div>
  );
};

export const AssessmentResultsScreen: React.FC = () => {
  const { lastAssessmentResult, assessmentHistorySummary, snapshot, navigate } = useApp();
  const latestAttempt = lastAssessmentResult?.attempt ?? snapshot.assessmentAttempts.at(-1) ?? null;
  const allSkills = useMemo(() => defaultDomainRegistry.getAllSkills(), []);

  if (!latestAttempt) {
    return (
      <div className="card">
        <h2>Assessment Results</h2>
        <p style={{ color: 'var(--text-secondary)' }}>No diagnostic assessment attempts recorded yet.</p>
        <button className="btn btn-primary" onClick={() => navigate('assessment')}>
          Start Baseline Diagnostic
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ marginTop: 0 }}>Verified Assessment Results</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-info">
              Method: {latestAttempt.evaluationMethod ?? 'deterministic'}
            </span>
            <span className="badge badge-success">
              Status: {latestAttempt.completionStatus ?? 'completed'}
            </span>
          </div>
        </div>
        <div className="card-grid">
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Demonstrated Score</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#06B6D4' }}>
              {latestAttempt.scorePercent}%
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {latestAttempt.correctCount}/{latestAttempt.totalQuestions} passed
            </div>
          </div>
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Avg Confidence Rating</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{latestAttempt.averageConfidence} / 5</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Never equated with mastery
            </div>
          </div>
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Total Time</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{latestAttempt.totalTimeSeconds}s</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {new Date(latestAttempt.completedAt).toLocaleString()}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('skill_gap')}>
            Inspect Skill-Gap Analysis
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('assessment')}>
            Retake Diagnostic
          </button>
        </div>
      </div>

      {lastAssessmentResult && (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Explainable Adaptive Assessment Recommendations</h3>
            <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>
              Next Recommended Difficulty:{' '}
              <span className="badge badge-info">
                {lastAssessmentResult.adaptiveDecision.recommendedNextDifficulty.toUpperCase()}
              </span>
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)' }}>
              {lastAssessmentResult.adaptiveDecision.reasons.map((reason, idx) => (
                <li key={idx} style={{ marginBottom: 6 }}>
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Topic-Wise Mastery & Confidence Calibration</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {lastAssessmentResult.discrepancies.map((d) => (
                <div
                  key={d.skillId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 12,
                    borderRadius: 10,
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <div>
                    <strong>{allSkills.find((s) => s.id === d.skillId)?.name ?? d.skillId}</strong>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Self-Confidence: {d.selfConfidencePercent}% • Demonstrated Score: {d.demonstratedScorePercent}%
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      d.calibration === 'calibrated'
                        ? 'badge-success'
                        : d.calibration === 'overconfident'
                          ? 'badge-danger'
                          : 'badge-warning'
                    }`}
                  >
                    {d.calibration}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Question Explanations & Diagnostic Feedback</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {lastAssessmentResult.reviews.map((r, i) => (
                <div key={r.questionId} className="card" style={{ background: 'var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    {r.isCorrect ? <CheckCircle2 size={18} color="#10B981" /> : <XCircle size={18} color="#EF4444" />}
                    <strong>
                      Q{i + 1}. {r.prompt}
                    </strong>
                    <span className="badge badge-info">{r.evaluationMethod}</span>
                    {r.isMisconception && (
                      <span className="badge badge-danger">High Confidence Wrong (Misconception)</span>
                    )}
                    {r.needsConfidenceReinforcement && (
                      <span className="badge badge-warning">Low Confidence Right (Reinforce)</span>
                    )}
                  </div>
                  <p style={{ margin: '4px 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                    <strong>Earned:</strong> {r.earnedScorePercent}% •{' '}
                    {r.options.length > 0 && r.correctOptionIndex >= 0
                      ? `Correct Option: ${r.options[r.correctOptionIndex]}`
                      : `Evaluated via ${r.evaluationMethod.replace('_', ' ')}`}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: 13.5, color: r.isCorrect ? '#6ee7b7' : '#fca5a5' }}>
                    {r.isCorrect ? r.explanation : r.incorrectFeedback}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {assessmentHistorySummary.totalAttempts > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Assessment History & Progress Comparisons</h3>
          <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 13.5 }}>
            Total Attempts: <strong>{assessmentHistorySummary.totalAttempts}</strong> • Best:{' '}
            <strong>{assessmentHistorySummary.bestScorePercent}%</strong> • Average:{' '}
            <strong>{assessmentHistorySummary.averageScorePercent}%</strong>
            {assessmentHistorySummary.scoreTrendDelta !== null && (
              <span> • First-to-Latest Delta: {assessmentHistorySummary.scoreTrendDelta >= 0 ? `+${assessmentHistorySummary.scoreTrendDelta}%` : `${assessmentHistorySummary.scoreTrendDelta}%`}</span>
            )}
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {assessmentHistorySummary.entries.map((e) => (
              <div
                key={e.attemptId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 10,
                  borderRadius: 8,
                  background: 'var(--bg-secondary)',
                  fontSize: 13,
                }}
              >
                <span>
                  <strong>{new Date(e.completedAt).toLocaleString()}</strong> — {e.scorePercent}%
                  {e.scoreDeltaFromPrevious !== null
                    ? ` (${e.scoreDeltaFromPrevious >= 0 ? `+${e.scoreDeltaFromPrevious}%` : `${e.scoreDeltaFromPrevious}%`} vs prev)`
                    : ''}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Confidence: {e.averageConfidence}/5 • Time: {e.totalTimeSeconds}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const SkillGapScreen: React.FC = () => {
  const { activeGoal, skillGap, advisoryService, aiStatus, regenerateRoadmapAndSchedule, navigate } = useApp();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const skillNameMap = useMemo(
    () => new Map(defaultDomainRegistry.getAllSkills().map((s) => [s.id, s.name])),
    [],
  );

  const handleExplainWithLlama = async () => {
    setAiError(null);
    if (aiStatus.state !== 'ready') {
      setAiError('Initialize local Llama 3.2 in Offline Model Settings first.');
      return;
    }
    setLoadingAi(true);
    try {
      const payload = JSON.stringify({
        goal: activeGoal?.title ?? 'Custom Target',
        strong: skillGap.strongSkills.map((s) => s.name),
        weak: skillGap.weakSkills.map((s) => s.name),
        missing: skillGap.missingSkills.map((s) => s.name),
        unassessed: skillGap.unassessedSkills.map((s) => s.name),
        recommendedNext: skillGap.recommendedNextSkills.map((s) => s.name),
        blocked: skillGap.blockedSkills.map((b) => ({
          skill: b.skill.name,
          waitingFor: b.blockedBy.map((p) => p.name),
        })),
      });
      const res = await advisoryService.explainSkillGap(payload);
      if (!res.ok) {
        setAiError(res.error);
      } else {
        setAiSummary(
          `${res.data.summary}\n\nPriority Focus:\n• ${res.data.priorityFocus.join('\n• ')}\n\nAdvice: ${res.data.studyAdvice}`,
        );
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Llama skill-gap explanation failed.');
    } finally {
      setLoadingAi(false);
    }
  };

  const renderGroup = (title: string, badgeClass: string, items: typeof skillGap.strongSkills) => (
    <div className="card" style={{ background: 'var(--bg-secondary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        <span className={`badge ${badgeClass}`}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>None in this category.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 13.5 }}>
          {items.map((s) => (
            <li key={s.id} style={{ marginBottom: 4 }}>
              {s.name} ({s.difficulty})
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>Skill Gap & Directed Prerequisite Analysis</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Graph Check: {skillGap.hasCycle ? `CYCLE DETECTED (${skillGap.cyclePath.join(' -> ')})` : 'Acyclic DAG Verified'} • Valid Topological Sequence ({skillGap.topologicalOrder.length} skills)
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => navigate('assessment')}>
              Assess Missing Foundations
            </button>
            <button
              className="btn btn-primary"
              disabled={skillGap.hasCycle || skillGap.topologicalOrder.length === 0}
              onClick={async () => {
                await regenerateRoadmapAndSchedule();
                navigate('roadmap');
              }}
            >
              Generate Personalised Roadmap
            </button>
          </div>
        </div>
      </div>

      <div className="card-grid">
        {renderGroup('Strong Skills (>= Target)', 'badge-success', skillGap.strongSkills)}
        {renderGroup('Weak Skills (45–74%)', 'badge-warning', skillGap.weakSkills)}
        {renderGroup('Missing Skills (< 45%)', 'badge-danger', skillGap.missingSkills)}
        {renderGroup('Unassessed Skills', 'badge-info', skillGap.unassessedSkills)}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Target Proficiency vs Assessment Evidence</h3>
        {skillGap.proficiencyComparisons.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Select a learning goal or target skills first to compute proficiency gaps.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {skillGap.proficiencyComparisons.map((item) => (
              <div
                key={item.skillId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                  padding: 12,
                  borderRadius: 10,
                  background: 'var(--bg-secondary)',
                }}
              >
                <div>
                  <strong>{item.skillName}</strong>{' '}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({item.domain})</span>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
                    Verified Mastery: <strong>{item.demonstratedPercent}%</strong> / Target{' '}
                    <strong>{item.targetPercent}%</strong> (Gap: {item.gapPercent}%) • Self-Confidence:{' '}
                    {item.selfReportedConfidence}% ({item.assessmentCount} attempt{item.assessmentCount === 1 ? '' : 's'})
                  </div>
                </div>
                <span className={`badge ${item.ready ? 'badge-success' : 'badge-warning'}`}>
                  {item.ready ? 'Prerequisites Ready' : `Blocked (${item.blockingIds.length})`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Prerequisite Dependency Graph & Learning Sequence</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 0 }}>
          <strong>Recommended Next (Foundations Verified / Ready Now):</strong>{' '}
          {skillGap.recommendedNextSkills.map((s) => s.name).join(', ') || 'None'}
        </p>

        {skillGap.recommendedNextSkills.length > 0 && (
          <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
            {skillGap.recommendedNextSkills.map((s) => {
              const unlocks = skillGap.unlockImpactMap[s.id] ?? [];
              return (
                <div
                  key={s.id}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    fontSize: 13.5,
                  }}
                >
                  <strong>{s.name}</strong> ({s.difficulty}) —{' '}
                  {unlocks.length > 0
                    ? `Unlocks: ${unlocks.map((id) => skillNameMap.get(id) ?? id).join(', ')}`
                    : 'Direct target competency'}
                </div>
              );
            })}
          </div>
        )}

        {skillGap.prerequisiteEdges.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Directed Prerequisite Edges ({skillGap.prerequisiteEdges.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {skillGap.prerequisiteEdges.map((edge) => (
                <span key={edge.id} className="badge badge-info" style={{ fontSize: 12 }}>
                  {(skillNameMap.get(edge.prerequisiteSkillId) ?? edge.prerequisiteSkillId)} {'→'}{' '}
                  {(skillNameMap.get(edge.skillId) ?? edge.skillId)} ({edge.strictness})
                </span>
              ))}
            </div>
          </div>
        )}

        {skillGap.blockedSkills.length > 0 && (
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {skillGap.blockedSkills.map((b) => (
              <div
                key={b.skill.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  borderRadius: 10,
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.28)',
                }}
              >
                <ShieldAlert size={18} color="#F59E0B" />
                <span style={{ fontSize: 13.5 }}>
                  <strong>{b.skill.name}</strong> ({b.skill.difficulty}) cannot be recommended ahead of verified foundations:{' '}
                  {b.blockedBy.map((p) => p.name).join(', ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#06B6D4" />
            <h3 style={{ margin: 0 }}>Local Llama 3.2 Skill-Gap Advisory</h3>
          </div>
          <button className="btn btn-secondary" disabled={loadingAi} onClick={handleExplainWithLlama}>
            {loadingAi ? 'Generating Locally...' : 'Explain Gaps with Local Llama'}
          </button>
        </div>
        {aiError && (
          <p style={{ color: '#fca5a5', fontSize: 13.5, marginTop: 10 }}>
            <AlertTriangle size={14} style={{ verticalAlign: 'middle' }} /> {aiError}
          </p>
        )}
        {aiSummary && (
          <pre className="code-block" style={{ marginTop: 12, fontFamily: 'inherit' }}>
            {aiSummary}
          </pre>
        )}
      </div>
    </div>
  );
};

export const LearningRoadmapScreen: React.FC = () => {
  const {
    snapshot,
    activePath,
    activeGoal,
    activeSchedule,
    roadmapProgressStats,
    setFocusedGoalId,
    regenerateRoadmapAndSchedule,
    previewRoadmapChanges,
    toggleRoadmapActivity,
    advisoryService,
    aiStatus,
    navigate,
    setSelectedResourceId,
    setSelectedQuizId,
  } = useApp();
  const [advisoryText, setAdvisoryText] = useState<string | null>(null);
  const [advisoryError, setAdvisoryError] = useState<string | null>(null);
  const [regenPreview, setRegenPreview] = useState<RoadmapRegenerationPreview | null>(null);
  const [actualMinutesInput, setActualMinutesInput] = useState<Record<string, string>>({});

  const weeklyBuckets = useMemo(
    () => (activeSchedule ? getWeeklyBuckets(activeSchedule.sessions).slice(0, 4) : []),
    [activeSchedule],
  );

  if (!activePath) {
    return (
      <div className="card">
        <h2>Learning Roadmap</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Select a learning goal first to generate your personalised roadmap.</p>
        <button className="btn btn-primary" onClick={() => navigate('goals')}>
          Choose Learning Goal
        </button>
      </div>
    );
  }

  const handleGetRoadmapAdvice = async () => {
    setAdvisoryError(null);
    if (aiStatus.state !== 'ready') {
      setAdvisoryError('Local Llama 3.2 is not initialized. Open Offline Model Settings to load it.');
      return;
    }
    try {
      const payload = JSON.stringify({
        goal: activeGoal?.title,
        totalHours: activePath.totalEstimatedHours,
        stages: activePath.stages.map((s) => ({ title: s.title, milestones: s.milestones.map((m) => m.title) })),
      });
      const res = await advisoryService.adviseRoadmap(payload);
      if (!res.ok) setAdvisoryError(res.error);
      else {
        setAdvisoryText(
          `${res.data.executiveSummary}\n\nMilestone Tips:\n• ${res.data.milestoneTips.join('\n• ')}\n\nProject Ideas:\n• ${res.data.projectIdeas.join('\n• ')}`,
        );
      }
    } catch (err) {
      setAdvisoryError(err instanceof Error ? err.message : 'Roadmap advisory failed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {snapshot.goals.length > 1 && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Goal-Wise Roadmap Switcher ({snapshot.goals.length} saved goals)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {snapshot.goals.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`btn ${g.id === activeGoal?.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: 12.5 }}
                onClick={() => setFocusedGoalId(g.id)}
              >
                {g.title} ({g.status ?? (g.isActive ? 'active' : 'paused')})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-info">
                Effort: {activePath.totalEstimatedHours} hrs • Budget: {activePath.weeklyHoursBudget ?? '—'}h/wk (~{activePath.estimatedWeeks ?? '—'}w)
              </span>
              {roadmapProgressStats && (
                <span className="badge badge-success">
                  Progress: {roadmapProgressStats.completedActivities}/{roadmapProgressStats.totalActivities} activities ({roadmapProgressStats.completionPercent}%) • Actual {roadmapProgressStats.actualMinutes}m / Est {roadmapProgressStats.estimatedMinutes}m
                </span>
              )}
            </div>
            <h2 style={{ margin: '10px 0 4px' }}>{activePath.title}</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{activePath.objective}</p>
            {activePath.regenerationSummary && (
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
                {activePath.regenerationSummary}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setRegenPreview(previewRoadmapChanges())}
            >
              Preview Regeneration Changes
            </button>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                setRegenPreview(null);
                await regenerateRoadmapAndSchedule();
              }}
            >
              Regenerate (Preserve Completed)
            </button>
            <button className="btn btn-primary" onClick={() => navigate('daily_planner')}>
              Open Full Study Planner
            </button>
          </div>
        </div>

        {(activePath.deadlineStatus?.warning || activeSchedule?.feasibilityWarning) && (
          <div className="badge badge-warning" style={{ width: '100%', padding: 10, borderRadius: 8, marginTop: 12 }}>
            {activePath.deadlineStatus?.warning ?? activeSchedule?.feasibilityWarning}
          </div>
        )}

        {regenPreview && (
          <div className="card" style={{ background: 'var(--bg-secondary)', marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <strong>Regeneration Impact Preview</strong>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  setRegenPreview(null);
                  await regenerateRoadmapAndSchedule();
                }}
              >
                Confirm & Apply Update
              </button>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              {regenPreview.summary} Hours Delta: {regenPreview.hoursDelta >= 0 ? `+${regenPreview.hoursDelta}h` : `${regenPreview.hoursDelta}h`}.
              {regenPreview.unlockedSkillIds.length > 0 && ` Newly unlocked: ${regenPreview.unlockedSkillIds.join(', ')}.`}
            </p>
            {regenPreview.deadlineWarning && (
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#FBBF24' }}>{regenPreview.deadlineWarning}</p>
            )}
          </div>
        )}
      </div>

      {weeklyBuckets.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Weekly Schedule Horizon (Next {weeklyBuckets.length} Week(s))</h3>
          <div className="card-grid">
            {weeklyBuckets.map((wb, idx) => (
              <div key={wb.weekStartISO} className="card" style={{ background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Week {idx + 1} ({wb.weekStartISO} to {wb.weekEndISO})
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, margin: '4px 0' }}>
                  {Math.round(wb.totalMinutes / 60 * 10) / 10}h planned
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {wb.sessions.length} session(s) • {wb.completedMinutes}m done
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activePath.stages.map((stage) => (
        <div key={stage.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0 }}>{stage.title}</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-muted)' }}>
                {stage.description} • {stage.estimatedHours} hrs
              </p>
            </div>
            <span className={`badge ${stage.status === 'completed' ? 'badge-success' : 'badge-info'}`}>
              {stage.status}
            </span>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {stage.milestones.map((m) => (
              <div key={m.id} className="card" style={{ background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <strong>{m.title}</strong>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {m.readinessState && (
                      <span
                        className={`badge ${
                          m.readinessState === 'completed'
                            ? 'badge-success'
                            : m.readinessState === 'blocked'
                              ? 'badge-warning'
                              : 'badge-info'
                        }`}
                      >
                        {m.readinessState}
                      </span>
                    )}
                    <span className="badge badge-info">{m.estimatedHours}h • {m.status}</span>
                  </div>
                </div>
                <p style={{ margin: '6px 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                  {m.description}
                </p>
                {m.reason && (
                  <p style={{ margin: '4px 0', fontSize: 12.5, color: '#22D3EE' }}>
                    <strong>Why Scheduled:</strong> {m.reason}
                  </p>
                )}
                <p style={{ margin: '4px 0 10px', fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Completion Criteria: {m.completionCriteria}
                </p>

                <div style={{ display: 'grid', gap: 8 }}>
                  {m.activities.map((a) => {
                    const isDone = a.status === 'completed';
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 8,
                          padding: 10,
                          borderRadius: 8,
                          background: 'var(--bg-primary)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 220 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                            {isDone ? '✓ ' : ''}
                            {a.title} ({a.type.replace('_', ' ')})
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            Est: {a.estimatedMinutes}m • Actual: {a.actualMinutes ?? 0}m
                            {a.reason ? ` — ${a.reason}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            className="input"
                            type="number"
                            min="1"
                            max="600"
                            style={{ width: 72, padding: '4px 6px', fontSize: 12 }}
                            value={actualMinutesInput[a.id] ?? String(a.actualMinutes || a.estimatedMinutes)}
                            onChange={(e) =>
                              setActualMinutesInput((prev) => ({ ...prev, [a.id]: e.target.value }))
                            }
                            aria-label={`Actual minutes for ${a.title}`}
                          />
                          <button
                            type="button"
                            className={`btn ${isDone ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: 12, padding: '5px 10px' }}
                            onClick={() =>
                              toggleRoadmapActivity(
                                activePath.id,
                                a.id,
                                isDone ? 'not_started' : 'completed',
                                Number(actualMinutesInput[a.id]) || a.estimatedMinutes,
                              )
                            }
                          >
                            {isDone ? 'Completed (Reopen)' : 'Mark Complete'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: 12, padding: '5px 10px' }}
                            onClick={() => {
                              if (a.type === 'quiz' || a.type === 'mcq') {
                                setSelectedQuizId(`quiz_${a.skillId}`);
                                navigate('quiz');
                              } else if (a.resourceId) {
                                setSelectedResourceId(a.resourceId);
                                navigate('content_viewer');
                              } else {
                                navigate('library');
                              }
                            }}
                          >
                            Open Material
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ margin: 0 }}>Local Llama Roadmap Advisory & Project Suggestions</h3>
          <button className="btn btn-secondary" onClick={handleGetRoadmapAdvice}>
            Generate Advisory Locally
          </button>
        </div>
        {advisoryError && <p style={{ color: '#fca5a5', fontSize: 13.5 }}>{advisoryError}</p>}
        {advisoryText && (
          <pre className="code-block" style={{ marginTop: 12, fontFamily: 'inherit' }}>
            {advisoryText}
          </pre>
        )}
      </div>
    </div>
  );
};
