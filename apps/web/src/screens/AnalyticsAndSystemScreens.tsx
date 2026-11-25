import React, { useState } from 'react';
import {
  Cpu,
  Download,
  FileJson,
  HardDrive,
  History,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  WEB_DEFAULT_MODEL_F16,
  WEB_FALLBACK_MODEL_F32,
} from '../ai/web-webllm-provider';
import { useApp } from '../state/AppContext';

export const ProgressDashboardScreen: React.FC = () => {
  const { snapshot, activeGoal, metrics, navigate } = useApp();

  const trendLabel: Record<typeof metrics.assessmentTrend, string> = {
    improving: 'Improving',
    stable: 'Stable',
    declining: 'Needs Attention (Declining)',
    insufficient_data: 'Insufficient Data',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="badge badge-info">Verified Database-Backed Progress</span>
            <h2 style={{ margin: '8px 0 4px' }}>
              Welcome back{snapshot.learner ? `, ${snapshot.learner.displayName}` : ''}
            </h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Active Goal: <strong>{activeGoal?.title ?? 'Not selected yet'}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('assessment')}>
              Take Assessment
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('recommendations')}>
              Adaptive Guidance
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('ai_assistant')}>
              Ask Local Llama
            </button>
          </div>
        </div>
        {metrics.evidenceStatus === 'insufficient' && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.35)',
              fontSize: 13.5,
              color: 'var(--text-secondary)',
            }}
          >
            Insufficient verified assessment evidence: study time and activity completions are tracked separately and do not increase demonstrated mastery until you complete diagnostic or topic assessments.
          </div>
        )}
      </div>

      <div className="card-grid">
        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Roadmap Activity Completion</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#06B6D4' }}>
            {metrics.roadmapCompletionPercent}%
          </div>
          <div className="progress-track" style={{ marginTop: 8 }}>
            <div className="progress-fill" style={{ width: `${metrics.roadmapCompletionPercent}%` }} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6 }}>
            {metrics.completedTopicsCount} completed • {metrics.inProgressActivitiesCount} in progress • {metrics.pendingTopicsCount} pending • {metrics.skippedActivitiesCount} skipped
          </div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Demonstrated Mastery vs Confidence</div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>
            {metrics.overallDemonstratedMasteryPercent !== null
              ? `${metrics.overallDemonstratedMasteryPercent}%`
              : 'Insufficient Evidence'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6 }}>
            Self-Reported Confidence: {metrics.averageSelfReportedConfidencePercent !== null ? `${metrics.averageSelfReportedConfidencePercent}%` : 'N/A'} • Evidence: {metrics.evidenceStatus}
          </div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Study Time & Consistency</div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>{metrics.totalStudyHours}h</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6 }}>
            Consistency (14d): {metrics.consistencyScorePercent}% ({metrics.activeStudyDaysLast14} active d) • Accuracy: {metrics.studyTimeAccuracyPercent !== null ? `${metrics.studyTimeAccuracyPercent}%` : 'No logs'} • Streak: {metrics.currentStreakDays}d
          </div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Assessment Performance & Trend</div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>
            {metrics.averageAssessmentScorePercent !== null
              ? `${metrics.averageAssessmentScorePercent}%`
              : metrics.averageQuizScorePercent !== null
                ? `${metrics.averageQuizScorePercent}%`
                : 'No attempts'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6 }}>
            Trend: {trendLabel[metrics.assessmentTrend]} • {snapshot.assessmentAttempts.length} diagnostic(s), {snapshot.quizAttempts.length} quiz(zes)
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Domain-Wise Progress ({metrics.domainProgress.length})</h3>
        {metrics.domainProgress.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Create a learning goal or run a diagnostic assessment to see domain progress.</p>
        ) : (
          <div className="card-grid">
            {metrics.domainProgress.map((dom) => (
              <div key={dom.domainId} className="card" style={{ background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong>{dom.domainName}</strong>
                  <span className="badge badge-info">{dom.evidenceStatus}</span>
                </div>
                <div className="progress-track" style={{ margin: '8px 0' }}>
                  <div className="progress-fill" style={{ width: `${dom.completionPercent}%` }} />
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  Completion: {dom.completionPercent}% ({dom.completedActivities}/{dom.completedActivities + dom.pendingActivities}) • Logged: {dom.studyHoursLogged}h
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                  Assessed Mastery: {dom.demonstratedMasteryPercent !== null ? `${dom.demonstratedMasteryPercent}%` : 'Insufficient evidence'} • Strong: {dom.strongSkillsCount}, Weak: {dom.weakSkillsCount}, Unassessed: {dom.unassessedSkillsCount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Goal-Wise Progress ({metrics.goalProgress.length})</h3>
        {metrics.goalProgress.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No learning goals recorded yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {metrics.goalProgress.map((gp) => (
              <div key={gp.goalId} className="card" style={{ background: 'var(--bg-secondary)', padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <strong>{gp.title}</strong>
                  <span className="badge badge-info">{gp.priority} • {gp.status}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Milestones: {gp.completedMilestones}/{gp.totalMilestones} • Activities: {gp.roadmapCompletionPercent}% • Mastery: {gp.demonstratedMasteryPercent !== null ? `${gp.demonstratedMasteryPercent}%` : 'Insufficient evidence'} • Logged: {gp.loggedStudyHours}h / {gp.plannedStudyHours}h planned
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Skill Mastery, Weak Areas & Retention Indicators</h3>
        <p style={{ marginTop: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>
          Retention intervals below are estimates calculated strictly from recorded assessment and revision session dates.
        </p>
        {metrics.skillProgress.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No assessed or targeted skills recorded yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {metrics.skillProgress.slice(0, 10).map((sp) => (
              <div
                key={sp.skillId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                  padding: 10,
                  borderRadius: 10,
                  background: 'var(--bg-secondary)',
                }}
              >
                <div>
                  <strong>{sp.skillName}</strong>{' '}
                  <span className={`badge ${sp.status === 'strong' ? 'badge-success' : sp.status === 'weak' ? 'badge-warning' : 'badge-info'}`}>
                    {sp.status}
                  </span>
                  {sp.isOverconfident && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Overconfidence Gap (+{sp.confidenceGap}%)</span>}
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    Demonstrated: {sp.assessmentCount > 0 ? `${sp.demonstratedCompetence}%` : 'Unassessed'} • Confidence: {sp.selfReportedConfidence}% • Study: {sp.studyMinutesLogged}m
                  </div>
                </div>
                <span className="badge badge-secondary">Retention risk: {sp.retentionRisk}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>7-Day Verified Activity</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, alignItems: 'end', minHeight: 110 }}>
          {metrics.weeklyActivity.map((day) => {
            const barHeight = Math.min(80, Math.max(8, Math.round((day.minutesStudied / 120) * 80)));
            return (
              <div key={day.dateISO} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    height: barHeight,
                    background: day.minutesStudied > 0 ? 'linear-gradient(180deg, #06B6D4, #6366F1)' : 'var(--bg-secondary)',
                    borderRadius: 8,
                    marginBottom: 6,
                  }}
                  title={`${day.dateISO}: ${day.minutesStudied} min`}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{day.dateISO.slice(5)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{day.minutesStudied}m</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const AdaptiveRecommendationsScreen: React.FC = () => {
  const {
    snapshot,
    adaptivePlanPreview,
    refreshAdaptiveRecommendations,
    respondToRecommendation,
    confirmAndApplyAdaptiveAdjustments,
    recalculateMissedSchedule,
    navigate,
  } = useApp();
  const [showPlanPreview, setShowPlanPreview] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>Adaptive Learning Recommendations</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
              Deterministic evidence-backed adaptations preserving completed study history until confirmed.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setShowPlanPreview((v) => !v)}>
              {showPlanPreview ? 'Hide Plan Preview' : 'Preview Plan Adjustments'}
            </button>
            <button className="btn btn-primary" onClick={refreshAdaptiveRecommendations}>
              <RefreshCw size={15} /> Re-Evaluate Rules
            </button>
          </div>
        </div>

        {showPlanPreview && adaptivePlanPreview && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 12,
              background: 'rgba(6,182,212,0.1)',
              border: '1px solid rgba(6,182,212,0.35)',
            }}
          >
            <strong>Adaptive Roadmap & Study Plan Preview (Confirmation Required)</strong>
            <p style={{ margin: '6px 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
              {adaptivePlanPreview.summary} • Recommended difficulty shift: <strong>{adaptivePlanPreview.suggestedDifficultyShift}</strong>
            </p>
            {adaptivePlanPreview.proposedActions.length > 0 && (
              <ul style={{ margin: '6px 0 10px', fontSize: 13, color: 'var(--text-secondary)' }}>
                {adaptivePlanPreview.proposedActions.map((act) => (
                  <li key={act.id}>
                    <strong>{act.description}</strong> — {act.rationale}
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowPlanPreview(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  await confirmAndApplyAdaptiveAdjustments();
                  setShowPlanPreview(false);
                }}
              >
                Confirm & Apply Adjustments
              </button>
            </div>
          </div>
        )}

        {snapshot.recommendations.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No active adaptation alerts. Complete assessments or study sessions to calibrate guidance.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {snapshot.recommendations.map((rec) => (
              <div key={rec.id} className="card" style={{ background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong>{rec.title}</strong>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {rec.recommendationType && <span className="badge badge-info">{rec.recommendationType}</span>}
                    <span className={`badge ${rec.priority === 'high' ? 'badge-danger' : 'badge-warning'}`}>
                      {rec.priority} • {rec.trigger}
                    </span>
                    {rec.status && <span className="badge badge-secondary">{rec.status}</span>}
                  </div>
                </div>
                <p style={{ margin: '8px 0', color: 'var(--text-secondary)', fontSize: 13.5 }}>{rec.rationale}</p>
                {rec.supportingEvidence && rec.supportingEvidence.length > 0 && (
                  <ul style={{ margin: '4px 0 8px', fontSize: 12.5, color: 'var(--text-muted)' }}>
                    {rec.supportingEvidence.map((ev, i) => (
                      <li key={`${rec.id}_ev_${i}`}>{ev}</li>
                    ))}
                  </ul>
                )}
                <p style={{ margin: '0 0 10px', color: 'var(--accent-cyan)', fontSize: 13 }}>
                  Action: {rec.suggestedAction}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {rec.trigger === 'missed_deadlines' && (
                    <button className="btn btn-secondary" onClick={() => recalculateMissedSchedule()}>
                      Reschedule Missed Now
                    </button>
                  )}
                  {(rec.trigger === 'unassessed_prerequisites' || rec.trigger === 'insufficient_evidence') && (
                    <button className="btn btn-primary" onClick={() => navigate('assessment')}>
                      Open Diagnostic Assessment
                    </button>
                  )}
                  <button className="btn btn-primary" onClick={() => respondToRecommendation(rec.id, 'accepted')}>
                    Accept Recommendation
                  </button>
                  <button className="btn btn-secondary" onClick={() => respondToRecommendation(rec.id, 'dismissed')}>
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const LearningHistoryScreen: React.FC = () => {
  const { snapshot } = useApp();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>
          <History size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Verified Learning History
        </h2>
        <h3>Diagnostic Assessments ({snapshot.assessmentAttempts.length})</h3>
        {snapshot.assessmentAttempts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No diagnostic assessments completed yet.</p>
        ) : (
          <ul style={{ color: 'var(--text-secondary)' }}>
            {snapshot.assessmentAttempts.map((a) => (
              <li key={a.id}>
                {new Date(a.completedAt).toLocaleString()} — Score: <strong>{a.scorePercent}%</strong> ({a.correctCount}/{a.totalQuestions}), Avg Confidence: {a.averageConfidence}/5
              </li>
            ))}
          </ul>
        )}

        <h3>Topic Quizzes ({snapshot.quizAttempts.length})</h3>
        {snapshot.quizAttempts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No topic quizzes completed yet.</p>
        ) : (
          <ul style={{ color: 'var(--text-secondary)' }}>
            {snapshot.quizAttempts.map((q) => (
              <li key={q.id}>
                {new Date(q.completedAt).toLocaleString()} — {q.quizId}: <strong>{q.scorePercent}%</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export const OfflineModelSettingsScreen: React.FC = () => {
  const {
    aiCapabilities,
    aiStatus,
    snapshot,
    updateSettings,
    initializeLocalModel,
    unloadLocalModel,
    navigate,
  } = useApp();
  const [modelError, setModelError] = useState<string | null>(null);

  const handleInit = async (modelId: string) => {
    setModelError(null);
    await updateSettings({ activeModelId: modelId });
    try {
      await initializeLocalModel(modelId);
    } catch (err) {
      setModelError(err instanceof Error ? err.message : 'Model initialization failed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>
          <Cpu size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Offline Local Llama Model Settings (WebLLM / WebGPU)
        </h2>
        <div className="card-grid" style={{ marginBottom: 16 }}>
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Detected Browser Backend</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
              {aiCapabilities?.backend.toUpperCase() ?? 'CHECKING'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              shader-f16: {aiCapabilities?.supportsShaderF16 ? 'Supported' : 'Not Supported (q4f32_1 fallback)'}
            </div>
          </div>

          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Model Runtime State</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: '#06B6D4' }}>
              {aiStatus.state.toUpperCase()}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              {aiStatus.statusMessage}
            </div>
          </div>
        </div>

        {(aiStatus.state === 'downloading' || aiStatus.state === 'loading') && (
          <div style={{ marginBottom: 16 }}>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${aiStatus.progressPercent}%` }} />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6 }}>
              {aiStatus.progressPercent}% — {aiStatus.statusMessage}
            </div>
          </div>
        )}

        {(modelError || aiStatus.errorMessage) && (
          <div className="badge badge-danger" style={{ width: '100%', padding: 12, borderRadius: 10, marginBottom: 14 }}>
            {modelError ?? aiStatus.errorMessage}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => handleInit(WEB_DEFAULT_MODEL_F16)}>
            Initialize Llama 3.2 1B (q4f16_1)
          </button>
          <button className="btn btn-secondary" onClick={() => handleInit(WEB_FALLBACK_MODEL_F32)}>
            Initialize Fallback (q4f32_1)
          </button>
          <button className="btn btn-secondary" onClick={unloadLocalModel}>
            Unload from GPU
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('model_downloads')}>
            Manage Cache & Storage
          </button>
        </div>
      </div>
    </div>
  );
};

export const ModelDownloadManagementScreen: React.FC = () => {
  const { snapshot, aiStatus, initializeLocalModel, deleteLocalModelCache } = useApp();
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>
        <HardDrive size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Model Download & Local Cache Management
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        WebLLM caches quantized Llama 3.2 weights and WebGPU WASM kernels in browser Cache Storage so inference works completely offline once cached.
      </p>
      <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 14 }}>
        <strong>Active Model: {snapshot.settings.activeModelId}</strong>
        <p style={{ margin: '6px 0', color: 'var(--text-muted)', fontSize: 13.5 }}>
          Estimated Storage: ~879 MB • Current Status: {aiStatus.state} ({aiStatus.progressPercent}%)
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button className="btn btn-primary" onClick={() => initializeLocalModel(snapshot.settings.activeModelId)}>
            <Download size={15} /> Cache / Load Model
          </button>
          <button className="btn btn-danger" onClick={() => deleteLocalModelCache(snapshot.settings.activeModelId)}>
            <Trash2 size={15} /> Remove Cached Weights
          </button>
        </div>
      </div>
    </div>
  );
};

export const DataExportScreen: React.FC = () => {
  const { exportBackupJson } = useApp();
  const [preview, setPreview] = useState<string>('');

  const handleGenerateAndDownload = async () => {
    const json = await exportBackupJson();
    setPreview(json.slice(0, 1200) + (json.length > 1200 ? '\n... (truncated preview)' : ''));
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-learning-companion-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>
        <FileJson size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Cross-Platform Data Export (SHA-256 Verified JSON)
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        Export your complete learner profile, goals, assessments, roadmaps, schedules, quiz history, and settings for transfer between Web, Android, and iOS.
      </p>
      <button className="btn btn-primary" onClick={handleGenerateAndDownload}>
        <Download size={16} /> Export & Download JSON Backup
      </button>
      {preview && <pre className="code-block" style={{ marginTop: 16 }}>{preview}</pre>}
    </div>
  );
};

export const DataImportScreen: React.FC = () => {
  const { importBackupJson } = useApp();
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setStatusMsg({ ok: false, text: 'File exceeds 25 MB security limit.' });
      return;
    }
    const raw = await file.text();
    const res = await importBackupJson(raw);
    setStatusMsg({ ok: res.ok, text: res.message });
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>
        <Upload size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Cross-Platform Data Import
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        Validates file size (&lt;= 25 MB), Zod schema, schema version, and SHA-256 integrity checksum before importing into IndexedDB.
      </p>
      <input type="file" accept="application/json,.json" onChange={handleFile} />
      {statusMsg && (
        <div
          className={`badge ${statusMsg.ok ? 'badge-success' : 'badge-danger'}`}
          style={{ marginTop: 14, padding: 12, borderRadius: 10, display: 'inline-flex' }}
        >
          {statusMsg.text}
        </div>
      )}
    </div>
  );
};

export const AppSettingsScreen: React.FC = () => {
  const { snapshot, updateSettings, resetAllLocalData } = useApp();
  const s = snapshot.settings;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Application Settings</h2>
      <div style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Strict Offline-Only Mode (Blocks network model fetches)</span>
          <input
            type="checkbox"
            checked={s.offlineOnlyMode}
            onChange={(e) => updateSettings({ offlineOnlyMode: e.target.checked })}
          />
        </label>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Auto-Adapt Study Schedule on Missed Sessions</span>
          <input
            type="checkbox"
            checked={s.autoAdaptSchedule}
            onChange={(e) => updateSettings({ autoAdaptSchedule: e.target.checked })}
          />
        </label>
        <div>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm('Erase all local IndexedDB learner records?')) {
                resetAllLocalData();
              }
            }}
          >
            <Trash2 size={15} /> Wipe All Local Data
          </button>
        </div>
      </div>
    </div>
  );
};

export const PrivacySettingsScreen: React.FC = () => {
  const { snapshot, updateSettings } = useApp();
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>
        <Lock size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Privacy & Security Controls
      </h2>
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="badge badge-success" style={{ width: 'fit-content' }}>
          <ShieldCheck size={15} /> Zero Remote LLM APIs • Zero Telemetry • Local-Only Persistence
        </div>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Strict Local-Only Processing Guarantee</span>
          <input
            type="checkbox"
            checked={snapshot.settings.privacyStrictLocalOnly}
            onChange={(e) => updateSettings({ privacyStrictLocalOnly: e.target.checked })}
          />
        </label>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          All learner profiles, diagnostic assessments, quiz scores, and prompts sent to Llama 3.2 remain strictly on this device. No analytics, tracking SDKs, or cloud inference endpoints are included.
        </p>
      </div>
    </div>
  );
};

export const AboutDocumentationScreen: React.FC = () => (
  <div className="card">
    <h2 style={{ marginTop: 0 }}>About & Documentation — AI Learning Companion</h2>
    <div className="badge badge-info" style={{ marginBottom: 14 }}>Built with Llama</div>
    <p style={{ color: 'var(--text-secondary)' }}>
      <strong>AI Learning Companion</strong> is a complete offline-first educational ecosystem featuring deterministic prerequisite skill graphs, diagnostic mastery evaluation, study planning, and genuine local Meta Llama 3.2 inference.
    </p>
    <h3>Local AI Runtimes</h3>
    <ul style={{ color: 'var(--text-secondary)' }}>
      <li><strong>Web:</strong> `@mlc-ai/web-llm` on WebGPU (`Llama-3.2-1B-Instruct-q4f16_1-MLC` + `q4f32_1` fallback) with Cache Storage offline persistence.</li>
      <li><strong>Android:</strong> Native Kotlin Expo Module wrapping `org.pytorch:executorch-android:1.5.1` (`LlmModule`, XNNPACK CPU backend).</li>
      <li><strong>iOS:</strong> Native Swift Expo Module wrapping `ExecuTorch` / `ExecuTorchLLM` via Swift Package Manager.</li>
    </ul>
    <h3>Meta Llama 3.2 Attribution Notice</h3>
    <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>
      Llama 3.2 is licensed under the Llama 3.2 Community License, Copyright © Meta Platforms, Inc. All Rights Reserved.
    </p>
  </div>
);
