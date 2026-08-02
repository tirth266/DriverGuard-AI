import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import MainLayout from './layouts/MainLayout'
import DashboardLayout from './layouts/DashboardLayout'
import ProtectedRoute from './components/shared/ProtectedRoute'

// Lazy-loaded pages
const Home                   = lazy(() => import('./pages/Home'))
const AuthPage               = lazy(() => import('./pages/Auth'))
const WorkspaceSelectionPage = lazy(() => import('./pages/WorkspaceSelection'))
const PersonalDashboard      = lazy(() => import('./pages/Dashboard'))
const FleetDashboardPage     = lazy(() => import('./pages/FleetDashboard'))
const CompanySetupPage       = lazy(() => import('./pages/CompanySetup'))
const AddDriverPage          = lazy(() => import('./pages/AddDriver'))
const AddVehiclePage         = lazy(() => import('./pages/AddVehicle'))
const MonitorPage            = lazy(() => import('./pages/Monitor'))
const RideSummaryPage        = lazy(() => import('./pages/RideSummary'))
const ProfilePage            = lazy(() => import('./pages/Profile'))
const SettingsPage           = lazy(() => import('./pages/Settings'))
const EnterprisePage         = lazy(() => import('./pages/Enterprise'))
const NotFound               = lazy(() => import('./pages/NotFound'))

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

/** Redirects already-authenticated users away from /login, /register, /auth */
function AuthRouteGuard({ defaultMode = 'signin' }: { defaultMode?: 'signin' | 'signup' }) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) return <LoadingFallback />

  if (isAuthenticated && user) {
    if (!user.hasSelectedWorkspace) {
      return <Navigate to="/select-workspace" replace />
    }
    const isBiz = user.role === 'business' || user.accountType === 'business'
    const destination = isBiz ? '/business/dashboard' : '/personal/dashboard'
    return <Navigate to={destination} replace />
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthPage defaultMode={defaultMode} />
    </Suspense>
  )
}

/** Legacy route redirector based on authenticated role */
function RoleRedirect({ subpath = 'dashboard' }: { subpath?: string }) {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />

  if (!user.hasSelectedWorkspace) {
    return <Navigate to="/select-workspace" replace />
  }

  const isBiz = user.role === 'business' || user.accountType === 'business'
  const dest = isBiz ? `/business/${subpath}` : `/personal/${subpath}`
  return <Navigate to={dest} replace />
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* ── Public Landing Page ── */}
        <Route path="/" element={
          <MainLayout>
            <Suspense fallback={<LoadingFallback />}><Home /></Suspense>
          </MainLayout>
        } />

        {/* ── Public Auth Routes (/login, /register, /auth) ── */}
        <Route path="/login" element={<AuthRouteGuard defaultMode="signin" />} />
        <Route path="/register" element={<AuthRouteGuard defaultMode="signup" />} />
        <Route path="/auth" element={<AuthRouteGuard defaultMode="signin" />} />

        {/* ━━━ WORKSPACE SELECTION SCREEN ━━━━━━━━━━━━━━━━━━━━ */}
        <Route path="/select-workspace" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}><WorkspaceSelectionPage /></Suspense>
          </ProtectedRoute>
        } />

        {/* ━━━ PERSONAL USER ROUTES (/personal/*) ━━━━━━━━━━━━━━ */}
        <Route path="/personal/dashboard" element={
          <ProtectedRoute requiredRole="personal">
            <DashboardLayout>
              <Suspense fallback={<LoadingFallback />}><PersonalDashboard /></Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/personal/monitoring" element={
          <ProtectedRoute requiredRole="personal">
            <Suspense fallback={<LoadingFallback />}><MonitorPage /></Suspense>
          </ProtectedRoute>
        } />

        <Route path="/personal/ride-summary" element={
          <ProtectedRoute requiredRole="personal">
            <Suspense fallback={<LoadingFallback />}><RideSummaryPage /></Suspense>
          </ProtectedRoute>
        } />

        <Route path="/personal/profile" element={
          <ProtectedRoute requiredRole="personal">
            <DashboardLayout>
              <Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/personal/settings" element={
          <ProtectedRoute requiredRole="personal">
            <DashboardLayout>
              <Suspense fallback={<LoadingFallback />}><SettingsPage /></Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* ━━━ BUSINESS USER ROUTES (/business/*) ━━━━━━━━━━━━━━ */}
        <Route path="/business/dashboard" element={
          <ProtectedRoute requiredRole="business">
            <Suspense fallback={<LoadingFallback />}><FleetDashboardPage /></Suspense>
          </ProtectedRoute>
        } />

        <Route path="/business/drivers" element={
          <ProtectedRoute requiredRole="business">
            <Suspense fallback={<LoadingFallback />}><FleetDashboardPage /></Suspense>
          </ProtectedRoute>
        } />

        <Route path="/business/drivers/add" element={
          <ProtectedRoute requiredRole="business">
            <Suspense fallback={<LoadingFallback />}><AddDriverPage /></Suspense>
          </ProtectedRoute>
        } />

        <Route path="/business/vehicles/add" element={
          <ProtectedRoute requiredRole="business">
            <Suspense fallback={<LoadingFallback />}><AddVehiclePage /></Suspense>
          </ProtectedRoute>
        } />

        <Route path="/business/monitoring" element={
          <ProtectedRoute requiredRole="business">
            <Suspense fallback={<LoadingFallback />}><MonitorPage /></Suspense>
          </ProtectedRoute>
        } />

        <Route path="/business/ride-summary" element={
          <ProtectedRoute requiredRole="business">
            <Suspense fallback={<LoadingFallback />}><RideSummaryPage /></Suspense>
          </ProtectedRoute>
        } />

        <Route path="/business/reports" element={
          <ProtectedRoute requiredRole="business">
            <Suspense fallback={<LoadingFallback />}><FleetDashboardPage /></Suspense>
          </ProtectedRoute>
        } />

        <Route path="/business/company" element={
          <ProtectedRoute requiredRole="business">
            <Suspense fallback={<LoadingFallback />}><CompanySetupPage /></Suspense>
          </ProtectedRoute>
        } />

        <Route path="/business/billing" element={
          <ProtectedRoute requiredRole="business">
            <Suspense fallback={<LoadingFallback />}><EnterprisePage /></Suspense>
          </ProtectedRoute>
        } />

        <Route path="/business/settings" element={
          <ProtectedRoute requiredRole="business">
            <DashboardLayout>
              <Suspense fallback={<LoadingFallback />}><SettingsPage /></Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* ── Legacy Backward-Compatibility Redirects ── */}
        <Route path="/ride-summary" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}><RideSummaryPage /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={<RoleRedirect subpath="dashboard" />} />
        <Route path="/monitoring" element={<RoleRedirect subpath="monitoring" />} />
        <Route path="/fleet" element={<Navigate to="/business/dashboard" replace />} />
        <Route path="/drivers" element={<Navigate to="/business/drivers" replace />} />
        <Route path="/profile" element={<RoleRedirect subpath="profile" />} />
        <Route path="/settings" element={<RoleRedirect subpath="settings" />} />
        <Route path="/enterprise" element={<Navigate to="/business/billing" replace />} />
        <Route path="/company-setup" element={<Navigate to="/business/company" replace />} />

        {/* ── 404 Not Found ── */}
        <Route path="*" element={
          <MainLayout>
            <Suspense fallback={<LoadingFallback />}><NotFound /></Suspense>
          </MainLayout>
        } />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <AnimatedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  )
}
