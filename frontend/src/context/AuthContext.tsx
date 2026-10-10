import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useToast } from './ToastContext'
import { workspaceService, type AccountType } from '../services/workspaceService'
import { restoreSession, saveSession, saveUser, clearSession } from '../services/authStorage'
import { setSessionExpiredHandler } from '../services/fleetApi'

export type { AccountType } from '../services/workspaceService'

export interface User {
  id: string
  name: string
  email: string
  company: string
  role: AccountType
  avatar?: string
  accountType: AccountType
  isFirstLogin: boolean
  companySetupComplete: boolean
  hasSelectedWorkspace: boolean
}

export interface CompanySetupData {
  companyName: string
  fleetSize: string
  country: string
  industry: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<boolean>
  signup: (name: string, company: string, email: string, pass: string, role?: AccountType) => Promise<boolean>
  loginWithGoogle: () => Promise<boolean>
  handleGoogleCallback: (token: string, rememberMe?: boolean) => Promise<boolean>
  forgotPassword: (email: string) => Promise<boolean>
  logout: (reason?: string) => void
  setAccountType: (type: AccountType) => void
  selectWorkspace: (type: AccountType) => void
  switchWorkspace: () => void
  completeCompanySetup: (data: CompanySetupData) => void
}

/* ─── API base ───────────────────────────────────────────── */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const buildApiUrl = (path: string) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

/* ─── Context ────────────────────────────────────────────── */

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Which workspace an account is using.
 *
 * The server's answer decides. A workspace preference stored in the browser is
 * a UI hint for a session that is already signed in, never an authorization
 * input: it is writable by anyone with devtools, and the backend does not read
 * it. Reading it ahead of the server is what let a localStorage edit move a
 * personal account into the fleet dashboard.
 */
function resolveAccountType(serverUser: { role?: string; account_type?: string } | null): AccountType {
  return serverUser?.role === 'business' || serverUser?.account_type === 'business'
    ? 'business'
    : 'personal'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()

  /* Restore session on boot */
  useEffect(() => {
    try {
      // One storage, one complete session: see services/authStorage. A token
      // without its profile, or a second session in the other storage, is
      // dropped there rather than paired across the two.
      const restored = restoreSession()

      if (restored) {
        setToken(restored.token)
        const parsed = JSON.parse(restored.user)
        const roleType = resolveAccountType(parsed)

        setUser({
          ...parsed,
          role: roleType,
          accountType: roleType,
          hasSelectedWorkspace: workspaceService.isWorkspaceSelected(),
        })
      }
    } catch {
      clearSession()
    } finally {
      setIsLoading(false)
    }
  }, [])

  /* Persist user changes back to storage automatically */
  const persistUser = useCallback((updatedUser: User) => {
    saveUser(JSON.stringify(updatedUser))
  }, [])

  /* Select workspace preference */
  const selectWorkspace = useCallback((type: AccountType) => {
    workspaceService.saveWorkspacePreference(type)
    setUser(prev => {
      if (!prev) return prev
      const updated: User = {
        ...prev,
        role: type,
        accountType: type,
        hasSelectedWorkspace: true,
      }
      persistUser(updated)
      return updated
    })
  }, [persistUser])

  /* Switch workspace */
  const switchWorkspace = useCallback(() => {
    workspaceService.clearWorkspacePreference()
    setUser(prev => {
      if (!prev) return prev
      const updated: User = {
        ...prev,
        hasSelectedWorkspace: false,
      }
      persistUser(updated)
      return updated
    })
  }, [persistUser])

  /* Handle Google OAuth callback */
  const handleGoogleCallback = useCallback(async (callbackToken: string, rememberMe = true): Promise<boolean> => {
    setIsLoading(true)

    try {
      const res = await fetch(buildApiUrl('/api/auth/me'), {
        headers: { 'Authorization': `Bearer ${callbackToken}` }
      })

      if (!res.ok) {
        throw new Error('Invalid token from Google OAuth')
      }

      const data = await res.json()
      if (!data.success || !data.user) {
        throw new Error('Failed to get user from token')
      }

      const roleType = resolveAccountType(data.user)

      const authUser: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        company: data.user.company || (roleType === 'personal' ? 'Personal Driver' : 'Fleet Company'),
        role: roleType,
        avatar: data.user.avatar,
        accountType: roleType,
        isFirstLogin: data.user.is_first_login ?? data.user.isFirstLogin ?? false,
        companySetupComplete: data.user.company_setup_complete ?? data.user.companySetupComplete ?? false,
        hasSelectedWorkspace: workspaceService.isWorkspaceSelected(),
      }

      setToken(callbackToken)
      setUser(authUser)

      // The workspace this account lands in is the one the server reported; it
      // is only remembered so the account finds it again next time.
      workspaceService.saveWorkspacePreference(roleType)
      saveSession(callbackToken, JSON.stringify(authUser), rememberMe)

      setIsLoading(false)
      toast.success('Authenticated via Google', `Welcome, ${authUser.name}!`)
      return true
    } catch (error) {
      setUser(null)
      setToken(null)
      setIsLoading(false)
      const message = error instanceof Error ? error.message : 'Unable to verify Google login with the backend.'
      toast.error('Google authentication failed', message)
      return false
    }
  }, [toast])

  /* ── Login ─────────────────────────────────────────────── */
  const login = async (email: string, _pass: string, rememberMe = true): Promise<boolean> => {
    setIsLoading(true)

    try {
      const res = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: _pass })
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Login failed')
      }

      const roleType = resolveAccountType(data.user)

      const authUser: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        company: data.user.company || (roleType === 'personal' ? 'Personal Driver' : 'Fleet Company'),
        role: roleType,
        avatar: data.user.avatar,
        accountType: roleType,
        isFirstLogin: data.user.is_first_login ?? data.user.isFirstLogin ?? false,
        companySetupComplete: data.user.company_setup_complete ?? data.user.companySetupComplete ?? false,
        hasSelectedWorkspace: workspaceService.isWorkspaceSelected(),
      }

      setToken(data.token)
      setUser(authUser)

      // Remembering the workspace this account resolved to is a convenience for
      // the next sign-in. It is never consulted ahead of the server's answer.
      workspaceService.saveWorkspacePreference(roleType)
      saveSession(data.token, JSON.stringify(authUser), rememberMe)

      setIsLoading(false)
      toast.success('Welcome Back!', `Logged in as ${authUser.name}`)
      return true
    } catch (error) {
      setUser(null)
      setToken(null)
      setIsLoading(false)
      const message = error instanceof Error ? error.message : 'Login failed.'
      toast.error('Login failed', message)
      return false
    }
  }

  /* ── Signup ────────────────────────────────────────────── */
  const signup = async (name: string, company: string, email: string, _pass: string, role: AccountType = 'personal'): Promise<boolean> => {
    setIsLoading(true)
    try {
      const res = await fetch(buildApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, email, password: _pass, role })
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Signup failed')
      }

      const roleType: AccountType = role
      workspaceService.saveWorkspacePreference(roleType)

      const authUser: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        company: company || (roleType === 'personal' ? 'Personal Driver' : 'Fleet Company'),
        role: roleType,
        avatar: data.user.avatar,
        accountType: roleType,
        isFirstLogin: false,
        companySetupComplete: true,
        hasSelectedWorkspace: true,
      }

      setToken(data.token)
      setUser(authUser)
      saveSession(data.token, JSON.stringify(authUser), true)

      setIsLoading(false)
      toast.success('Account Created!', `Welcome to DriverGuard AI, ${name}!`)
      return true
    } catch (error) {
      setUser(null)
      setToken(null)
      setIsLoading(false)
      const message = error instanceof Error ? error.message : 'Signup failed.'
      toast.error('Signup failed', message)
      return false
    }
  }

  /* ── Google login ──────────────────────────────────────── */
  const loginWithGoogle = async (): Promise<boolean> => {
    window.location.href = buildApiUrl('/api/auth/google')
    return new Promise(() => {})
  }

  /* ── Forgot password ───────────────────────────────────── */
  /**
   * Password reset is not available.
   *
   * There is no password-reset endpoint on the backend, so this cannot send a
   * link and must not report that one was sent. It returns false and tells the
   * user what to do instead. Reinstating real reset means adding the backend
   * endpoint first, then calling it here.
   */
  const forgotPassword = async (_email: string): Promise<boolean> => {
    toast.error(
      'Password Reset Unavailable',
      'There is no password reset endpoint yet, so no email was sent. Sign in with Google, or contact your administrator.',
    )
    return false
  }

  /* ── Set account type ──────────────────────────────────── */
  const setAccountType = useCallback((type: AccountType) => {
    workspaceService.saveWorkspacePreference(type)
    setUser(prev => {
      if (!prev) return prev
      const updated: User = { ...prev, role: type, accountType: type, isFirstLogin: false, hasSelectedWorkspace: true }
      persistUser(updated)
      return updated
    })
  }, [persistUser])

  /* ── Complete company setup ────────────────────────────── */
  const completeCompanySetup = useCallback((data: CompanySetupData) => {
    setUser(prev => {
      if (!prev) return prev
      const updated: User = {
        ...prev,
        company: data.companyName,
        companySetupComplete: true,
      }
      persistUser(updated)
      return updated
    })
  }, [persistUser])

  /* ── Logout ───────────────────────────────────────────── */
  // A 401 can arrive from many requests at once, so the first one ends the
  // session and the rest are ignored. Without this the frame loop alone would
  // call logout once per rejected frame.
  const logout = useCallback((reason?: string) => {
    if (!token && !user) return
    setUser(null)
    setToken(null)
    // Everything this account left behind, in both storages: the session, and
    // the workspace it resolved to. Leaving the workspace behind meant the next
    // account to sign in on this browser inherited the previous one's, and
    // because the workspace was read back on sign-in it also decided where that
    // account landed.
    clearSession()
    workspaceService.clearWorkspacePreference()
    toast.info('Logged Out', reason ?? 'You have been safely signed out.')
  }, [toast, token, user])

  /* Any rejected token ends the session, wherever it is noticed. */
  useEffect(() => {
    setSessionExpiredHandler((reason) => logout(reason || 'Your session has expired. Please sign in again.'))
    return () => setSessionExpiredHandler(null)
  }, [logout])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      login,
      signup,
      loginWithGoogle,
      handleGoogleCallback,
      forgotPassword,
      logout,
      setAccountType,
      selectWorkspace,
      switchWorkspace,
      completeCompanySetup,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
