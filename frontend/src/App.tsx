import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import MainLayout from './layouts/MainLayout'
import DashboardLayout from './layouts/DashboardLayout'
import ProtectedRoute from './components/shared/ProtectedRoute'

// Lazy-loaded pages
const Home = lazy(() => import('./pages/Home'))
const AuthPage = lazy(() => import('./pages/Auth'))
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const MonitorPage = lazy(() => import('./pages/Monitor'))
const ProfilePage = lazy(() => import('./pages/Profile'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" aria-label="Loading page">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-on-surface-variant text-xs tracking-widest uppercase font-semibold">
          Loading DriverGuard AI…
        </p>
      </div>
    </div>
  )
}

// Redirect authenticated users away from /auth to /dashboard
function AuthRouteGuard() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <LoadingFallback />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthPage />
    </Suspense>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Landing Page */}
        <Route
          path="/"
          element={
            <MainLayout>
              <Suspense fallback={<LoadingFallback />}>
                <Home />
              </Suspense>
            </MainLayout>
          }
        />

        {/* Public Auth Page */}
        <Route path="/auth" element={<AuthRouteGuard />} />

        {/* Protected Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <DashboardPage />
                </Suspense>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Protected Live Monitoring Route */}
        <Route
          path="/monitor"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingFallback />}>
                <MonitorPage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Protected User Profile Route */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingFallback />}>
                <ProfilePage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Protected Settings Route */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingFallback />}>
                <SettingsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* 404 Not Found */}
        <Route
          path="*"
          element={
            <MainLayout>
              <Suspense fallback={<LoadingFallback />}>
                <NotFound />
              </Suspense>
            </MainLayout>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
