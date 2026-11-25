import React from 'react';
import type { AppScreenId } from '@alc/shared-types';
import {
  Activity,
  Award,
  BookOpen,
  Calendar,
  Compass,
  Cpu,
  Download,
  FileJson,
  HelpCircle,
  History,
  Info,
  Layers,
  Lock,
  MessageSquare,
  Settings,
  Sliders,
  Sparkles,
  Target,
  Upload,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { AppProvider, useApp } from './state/AppContext';
import {
  GoalSelectionScreen,
  OnboardingAndProfileScreen,
  SplashScreen,
  WelcomeScreen,
} from './screens/OnboardingAndProfileScreens';
import {
  AssessmentResultsScreen,
  LearningRoadmapScreen,
  SkillAssessmentScreen,
  SkillGapScreen,
} from './screens/AssessmentAndRoadmapScreens';
import {
  AIAssistantScreen,
  ContentViewerScreen,
  DailyPlannerScreen,
  LearningLibraryScreen,
  MonthlyTargetsScreen,
  QuizInterfaceScreen,
  QuizResultsScreen,
  WeeklyPlannerScreen,
} from './screens/PlannerAndLearningScreens';
import {
  AboutDocumentationScreen,
  AdaptiveRecommendationsScreen,
  AppSettingsScreen,
  DataExportScreen,
  DataImportScreen,
  LearningHistoryScreen,
  ModelDownloadManagementScreen,
  OfflineModelSettingsScreen,
  PrivacySettingsScreen,
  ProgressDashboardScreen,
} from './screens/AnalyticsAndSystemScreens';
import { InferencePocScreen } from './screens/InferencePocScreen';

const NAV_GROUPS: Array<{
  heading: string;
  items: Array<{ id: AppScreenId; label: string; icon: React.ReactNode }>;
}> = [
  {
    heading: 'Overview',
    items: [
      { id: 'dashboard', label: 'Progress Dashboard', icon: <Activity size={16} /> },
      { id: 'recommendations', label: 'Adaptive Insights', icon: <Sparkles size={16} /> },
      { id: 'history', label: 'Learning History', icon: <History size={16} /> },
    ],
  },
  {
    heading: 'Diagnosis & Path',
    items: [
      { id: 'profile', label: 'Learner Profile', icon: <User size={16} /> },
      { id: 'goals', label: 'Goal Selection', icon: <Target size={16} /> },
      { id: 'assessment', label: 'Skill Assessment', icon: <HelpCircle size={16} /> },
      { id: 'assessment_results', label: 'Assessment Results', icon: <Award size={16} /> },
      { id: 'skill_gap', label: 'Skill Gap Analysis', icon: <Layers size={16} /> },
      { id: 'roadmap', label: 'Learning Roadmap', icon: <Compass size={16} /> },
    ],
  },
  {
    heading: 'Study & AI',
    items: [
      { id: 'daily_planner', label: 'Daily Planner', icon: <Calendar size={16} /> },
      { id: 'weekly_planner', label: 'Weekly Planner', icon: <Calendar size={16} /> },
      { id: 'monthly_targets', label: 'Monthly Targets', icon: <Calendar size={16} /> },
      { id: 'library', label: 'Learning Library', icon: <BookOpen size={16} /> },
      { id: 'quiz', label: 'Quizzes', icon: <Award size={16} /> },
      { id: 'ai_assistant', label: 'AI Assistant (Llama)', icon: <MessageSquare size={16} /> },
    ],
  },
  {
    heading: 'Local AI & Data',
    items: [
      { id: 'model_settings', label: 'Offline Model Settings', icon: <Cpu size={16} /> },
      { id: 'model_downloads', label: 'Model Downloads', icon: <Download size={16} /> },
      { id: 'inference_poc', label: 'Inference POC Lab', icon: <Sparkles size={16} /> },
      { id: 'data_export', label: 'Data Export', icon: <FileJson size={16} /> },
      { id: 'data_import', label: 'Data Import', icon: <Upload size={16} /> },
      { id: 'app_settings', label: 'App Settings', icon: <Settings size={16} /> },
      { id: 'privacy_settings', label: 'Privacy Settings', icon: <Lock size={16} /> },
      { id: 'about', label: 'About & Docs', icon: <Info size={16} /> },
    ],
  },
];

const ScreenRouter: React.FC = () => {
  const { screen } = useApp();
  switch (screen) {
    case 'splash':
      return <SplashScreen />;
    case 'welcome':
      return <WelcomeScreen />;
    case 'onboarding':
      return <OnboardingAndProfileScreen isEditMode={false} />;
    case 'profile':
      return <OnboardingAndProfileScreen isEditMode={true} />;
    case 'goals':
      return <GoalSelectionScreen />;
    case 'assessment':
      return <SkillAssessmentScreen />;
    case 'assessment_results':
      return <AssessmentResultsScreen />;
    case 'skill_gap':
      return <SkillGapScreen />;
    case 'roadmap':
      return <LearningRoadmapScreen />;
    case 'daily_planner':
      return <DailyPlannerScreen />;
    case 'weekly_planner':
      return <WeeklyPlannerScreen />;
    case 'monthly_targets':
      return <MonthlyTargetsScreen />;
    case 'library':
      return <LearningLibraryScreen />;
    case 'content_viewer':
      return <ContentViewerScreen />;
    case 'ai_assistant':
      return <AIAssistantScreen />;
    case 'quiz':
      return <QuizInterfaceScreen />;
    case 'quiz_results':
      return <QuizResultsScreen />;
    case 'dashboard':
      return <ProgressDashboardScreen />;
    case 'recommendations':
      return <AdaptiveRecommendationsScreen />;
    case 'history':
      return <LearningHistoryScreen />;
    case 'model_settings':
      return <OfflineModelSettingsScreen />;
    case 'model_downloads':
      return <ModelDownloadManagementScreen />;
    case 'inference_poc':
      return <InferencePocScreen />;
    case 'data_export':
      return <DataExportScreen />;
    case 'data_import':
      return <DataImportScreen />;
    case 'app_settings':
      return <AppSettingsScreen />;
    case 'privacy_settings':
      return <PrivacySettingsScreen />;
    case 'about':
      return <AboutDocumentationScreen />;
    default:
      return <ProgressDashboardScreen />;
  }
};

const Shell: React.FC = () => {
  const { screen, navigate, isOnline, aiStatus, snapshot } = useApp();

  if (screen === 'splash' || screen === 'welcome') {
    return <ScreenRouter />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary Navigation">
        <div className="brand-header">
          <div className="brand-badge">AI</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>Learning Companion</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Built with Llama 3.2</div>
          </div>
        </div>

        {NAV_GROUPS.map((group) => (
          <div key={group.heading}>
            <div className="nav-section-title">{group.heading}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-btn ${screen === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sliders size={16} color="#06B6D4" />
            <strong style={{ fontSize: 14.5 }}>
              {snapshot.learner ? `${snapshot.learner.displayName}'s Workspace` : 'Learner Workspace'}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className={`badge ${isOnline ? 'badge-success' : 'badge-warning'}`}>
              {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
              {isOnline ? 'Network Online' : 'Offline Mode'}
            </span>
            <button
              type="button"
              className={`badge ${aiStatus.state === 'ready' ? 'badge-success' : 'badge-info'}`}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('model_settings')}
            >
              <Cpu size={13} /> Llama 3.2: {aiStatus.state}
            </button>
          </div>
        </header>

        <main className="content-container">
          <ScreenRouter />
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => (
  <AppProvider>
    <Shell />
  </AppProvider>
);

export default App;
