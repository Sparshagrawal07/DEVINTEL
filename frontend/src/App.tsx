import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider, Spinner } from './components/primitives';
import { AppLayout, ProtectedRoute, PublicRoute, OnboardingRoute } from './components/layout';
import { useAuthStore } from './context/auth.store';
import { useThemeStore } from './context/theme.store';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/Login').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/Register').then((m) => ({ default: m.RegisterPage })));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallback').then((m) => ({ default: m.OAuthCallbackPage })));
const OnboardingPage = lazy(() => import('./pages/Onboarding').then((m) => ({ default: m.OnboardingPage })));
const DashboardPage = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.DashboardPage })));
const RepositoriesPage = lazy(() => import('./pages/Repositories').then((m) => ({ default: m.RepositoriesPage })));
const ResumePage = lazy(() => import('./pages/Resume').then((m) => ({ default: m.ResumePage })));
const ProfilePage = lazy(() => import('./pages/Profile').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((s) => s.initialize);
  const initTheme = useThemeStore((s) => s.initialize);

  useEffect(() => {
    initTheme();
    initAuth();
  }, [initAuth, initTheme]);

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AppInitializer>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route
                path="/login"
                element={<PublicRoute><LoginPage /></PublicRoute>}
              />
              <Route
                path="/register"
                element={<PublicRoute><RegisterPage /></PublicRoute>}
              />
              <Route path="/auth/callback" element={<OAuthCallbackPage />} />

              {/* Onboarding route (auth required, not yet onboarded) */}
              <Route
                path="/onboarding"
                element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>}
              />

              {/* Protected routes with layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/repositories" element={<RepositoriesPage />} />
                <Route path="/resume" element={<ResumePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AppInitializer>
      </ToastProvider>
    </BrowserRouter>
  );
}
