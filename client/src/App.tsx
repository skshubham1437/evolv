import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { HabitsPage } from './pages/HabitsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AIProvider } from './context/AIContext';
import { ToastProvider } from './context/ToastContext';
import { AiChatPanel } from './components/AiChatPanel';
import { VisionPage } from './pages/VisionPage';
import { JournalPage } from './pages/JournalPage';
import { GoalsPage } from './pages/GoalsPage';
import { QuarterlyPage } from './pages/QuarterlyPage';
import { MonthlyPage } from './pages/MonthlyPage';
import { WeeklyPage } from './pages/WeeklyPage';
import { TasksPage } from './pages/TasksPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { FocusModePage } from './pages/FocusModePage';
import { SessionSummaryPage } from './pages/SessionSummaryPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { OnboardingPage } from './pages/auth/OnboardingPage';

export default function App() {
  return (
    <ToastProvider>
      <AIProvider>
        <div className="w-full h-screen bg-[var(--color-background)] overflow-hidden font-body-md text-[var(--color-on-background)] selection:bg-[var(--color-primary)]/30">
          <Routes>
            {/* Public auth routes — no Layout wrapper */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

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
                    <Routes>
                      <Route path="/"          element={<DashboardPage />} />
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
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
        <AiChatPanel />
      </AIProvider>
    </ToastProvider>
  );
}
