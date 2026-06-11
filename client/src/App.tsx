import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { AIProvider } from './context/AIContext';
import { ToastProvider } from './context/ToastContext';
import { AiChatPanel } from './components/AiChatPanel';
import { useAuth } from './context/AuthContext';

// Lazy load page components
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const HabitsPage = React.lazy(() => import('./pages/HabitsPage').then(m => ({ default: m.HabitsPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const VisionPage = React.lazy(() => import('./pages/VisionPage').then(m => ({ default: m.VisionPage })));
const JournalPage = React.lazy(() => import('./pages/JournalPage').then(m => ({ default: m.JournalPage })));
const GoalsPage = React.lazy(() => import('./pages/GoalsPage').then(m => ({ default: m.GoalsPage })));
const QuarterlyPage = React.lazy(() => import('./pages/QuarterlyPage').then(m => ({ default: m.QuarterlyPage })));
const MonthlyPage = React.lazy(() => import('./pages/MonthlyPage').then(m => ({ default: m.MonthlyPage })));
const WeeklyPage = React.lazy(() => import('./pages/WeeklyPage').then(m => ({ default: m.WeeklyPage })));
const TasksPage = React.lazy(() => import('./pages/TasksPage').then(m => ({ default: m.TasksPage })));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const FocusModePage = React.lazy(() => import('./pages/FocusModePage').then(m => ({ default: m.FocusModePage })));
const SessionSummaryPage = React.lazy(() => import('./pages/SessionSummaryPage').then(m => ({ default: m.SessionSummaryPage })));
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const OnboardingPage = React.lazy(() => import('./pages/auth/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const ForgotPasswordPage = React.lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ShutdownPage = React.lazy(() => import('./pages/ShutdownPage').then(m => ({ default: m.ShutdownPage })));
const LandingPage = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));

function LoadingIndicator() {
  return (
    <div className="flex-1 w-full h-full flex items-center justify-center bg-[var(--color-surface-container-lowest)] p-8">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-outline)]">Initializing...</span>
      </div>
    </div>
  );
}

function HomeRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <ProtectedRoute>
        <Layout>
          <DashboardPage />
        </Layout>
      </ProtectedRoute>
    );
  }

  return <LandingPage />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AIProvider>
          <div className="w-full h-screen bg-[var(--color-background)] overflow-hidden font-body-md text-[var(--color-on-background)] selection:bg-[var(--color-primary)]/30">
            <Suspense fallback={<LoadingIndicator />}>
              <Routes>
                {/* Dynamic path routing on root / */}
                <Route path="/" element={<HomeRoute />} />

                {/* Public auth routes — no Layout wrapper */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                {/* Onboarding — Full screen, protected, but doesn't require onboarding itself */}
                <Route path="/onboarding" element={
                  <ProtectedRoute requireOnboarding={false}>
                    <OnboardingPage />
                  </ProtectedRoute>
                } />

                {/* Protected app routes — wrapped in Layout + ProtectedRoute */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Suspense fallback={<LoadingIndicator />}>
                          <Routes>
                            <Route path="/vision"    element={<VisionPage />} />
                            <Route path="/goals"     element={<GoalsPage />} />
                            <Route path="/quarterly" element={<QuarterlyPage />} />
                            <Route path="/monthly"   element={<MonthlyPage />} />
                            <Route path="/weekly"    element={<WeeklyPage />} />
                            <Route path="/daily"     element={<TasksPage />} />
                            <Route path="/habits"    element={<HabitsPage />} />
                            <Route path="/journal"   element={<JournalPage />} />
                            <Route path="/analytics" element={<AnalyticsPage />} />
                            <Route path="/settings"  element={<SettingsPage />} />
                            <Route path="/focus"     element={<FocusModePage />} />
                            <Route path="/summary"   element={<SessionSummaryPage />} />
                            <Route path="/shutdown"  element={<ShutdownPage />} />
                          </Routes>
                        </Suspense>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
          </div>
          <AiChatPanel />
        </AIProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
