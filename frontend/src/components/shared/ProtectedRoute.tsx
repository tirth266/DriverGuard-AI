import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  /** Only allow business account type users */
  businessOnly?: boolean
}

function Spinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-on-surface-variant text-xs tracking-widest uppercase font-semibold">
          Verifying Session…
        </p>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children, businessOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()
  const path = location.pathname

  if (isLoading) return <Spinner />

  // Not logged in → /auth
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  // First login and no account type selected → /onboarding (unless already there)
  if (user && user.isFirstLogin && user.accountType === null && path !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  // Business user who hasn't completed company setup → /company-setup
  if (
    user?.accountType === 'business' &&
    !user.companySetupComplete &&
    path !== '/company-setup' &&
    path !== '/onboarding'
  ) {
    return <Navigate to="/company-setup" replace />
  }

  // Business-only route: personal users → /dashboard
  if (businessOnly && user?.accountType !== 'business') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
