import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import MainLayout from './layouts/MainLayout'
import DashboardLayout from './layouts/DashboardLayout'
import ProtectedRoute from './components/shared/ProtectedRoute'

// Lazy-loaded pages
const Home           = lazy(() => import('./pages/Home'))
const AuthPage       = lazy(() => import('./pages/Auth'))
const DashboardPage  = lazy(() => import('./pages/Dashboard'))
const FleetDashboardPage = lazy(() => import('./pages/FleetDashboard'))
const CompanySetupPage   = lazy(() => import('./pages/CompanySetup'))
const AddDriverPage  = lazy(() => import('./pages/AddDriver'))
const AddVehiclePage = lazy(() => import('./pages/AddVehicle'))
const MonitorPage    = lazy(() => import('./pages/Monitor'))
const ProfilePage    = lazy(() => import('./pages/Profile'))
const SettingsPage   = lazy(() => import('./pages/Settings'))
const OnboardingPage = lazy(() => import('./pages/Onboarding'))
const EnterprisePage = lazy(() => import('./pages/Enterprise'))
const NotFound       = lazy(() => import('./pages/NotFound'))

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

/** Redirect already-authenticated users away from /auth */
function AuthRouteGuard() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) return <LoadingFallback />

  if (isAuthenticated) {
    if (user?.isFirstLogin && user?.accountType === null) {
      return <Navigate to="/onboarding" replace />
    }
    if (user?.accountType === 'business' && !user.companySetupComplete) {
      return <Navigate to="/company-setup" replace />
    }
    if (user?.accountType === 'business') {
      return <Navigate to="/fleet" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

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
        <Route path="/" element={
          <MainLayout>
            <Suspense fallback={<LoadingFallback />}><Home /></Suspense>
          </MainLayout>
        } />

        {/* Public Auth Page */}
        <Route path="/auth" element={<AuthRouteGuard />} />

        {/* Onboarding */}
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}><OnboardingPage /></Suspense>
          </ProtectedRoute>
        } />

        {/* Company Setup for Business */}
        <Route path="/company-setup" element={
          <ProtectedRoute businessOnly>
            <Suspense fallback={<LoadingFallback />}><CompanySetupPage /></Suspense>
          </ProtectedRoute>
        } />

        {/* Personal Dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<LoadingFallback />}><DashboardPage /></Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Business Fleet Dashboard */}
        <Route path="/fleet" element={
          <ProtectedRoute businessOnly>
            <Suspense fallback={<LoadingFallback />}><FleetDashboardPage /></Suspense>
          </ProtectedRoute>
        } />

        {/* Drivers Redirect & Add */}
        <Route path="/drivers" element={<Navigate to="/fleet" replace />} />
        <Route path="/drivers/add" element={
          <ProtectedRoute businessOnly>
            <Suspense fallback={<LoadingFallback />}><AddDriverPage /></Suspense>
          </ProtectedRoute>
        } />

        {/* Vehicles Redirect & Add */}
        <Route path="/vehicles" element={<Navigate to="/fleet" replace />} />
        <Route path="/vehicles/add" element={
          <ProtectedRoute businessOnly>
            <Suspense fallback={<LoadingFallback />}><AddVehiclePage /></Suspense>
          </ProtectedRoute>
        } />

        {/* Enterprise / Business Pricing */}
        <Route path="/enterprise" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}><EnterprisePage /></Suspense>
          </ProtectedRoute>
        } />

        {/* Live Monitoring Center (/monitoring & /monitor) */}
        <Route path="/monitoring" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}><MonitorPage /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/monitor" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}><MonitorPage /></Suspense>
          </ProtectedRoute>
        } />

        {/* Profile */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense>
          </ProtectedRoute>
        } />

        {/* Settings */}
        <Route path="/settings" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}><SettingsPage /></Suspense>
          </ProtectedRoute>
        } />

        {/* 404 */}
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
      <AuthProvider>
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
