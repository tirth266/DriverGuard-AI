import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import MainLayout from './layouts/MainLayout'
import DashboardLayout from './layouts/DashboardLayout'

// Lazy-loaded pages for performance
const Home = lazy(() => import('./pages/Home/Home'))
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'))
const NotFound = lazy(() => import('./pages/NotFound/NotFound'))

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-on-surface-variant text-label-caps text-sm tracking-widest uppercase">
          Loading…
        </p>
      </div>
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Marketing / Main Layout */}
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

        {/* Dashboard — full-screen dark layout */}
        <Route
          path="/dashboard"
          element={
            <DashboardLayout>
              <Suspense fallback={<LoadingFallback />}>
                <DashboardPage />
              </Suspense>
            </DashboardLayout>
          }
        />

        {/* 404 */}
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
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  )
}
