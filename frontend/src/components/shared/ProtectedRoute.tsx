import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'personal' | 'business' | string
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

export default function ProtectedRoute({ children, requiredRole, businessOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) return <Spinner />

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Normalize role strictly to 'business' or 'personal' (defaults non-business to 'personal')
  const isBusiness = user.role === 'business' || user.accountType === 'business'
  const userRole: 'personal' | 'business' = isBusiness ? 'business' : 'personal'

  // Route protection role check
  if (requiredRole && userRole !== requiredRole) {
    const target = userRole === 'business' ? '/business/dashboard' : '/personal/dashboard'
    return <Navigate to={target} replace />
  }

  if (businessOnly && userRole !== 'business') {
    return <Navigate to="/personal/dashboard" replace />
  }

  return <>{children}</>
}
