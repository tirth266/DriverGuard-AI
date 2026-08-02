import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useToast } from './ToastContext'

/* ─── Types ─────────────────────────────────────────────── */

export type AccountType = 'personal' | 'business' | null

export interface User {
  id: string
  name: string
  email: string
  company: string
  role: string
  avatar?: string
  accountType: AccountType
  isFirstLogin: boolean
  companySetupComplete: boolean
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
  signup: (name: string, company: string, email: string, pass: string) => Promise<boolean>
  loginWithGoogle: () => Promise<boolean>
  handleGoogleCallback: (token: string, rememberMe?: boolean) => Promise<boolean>
  forgotPassword: (email: string) => Promise<boolean>
  logout: () => void
  setAccountType: (type: AccountType) => void
  completeCompanySetup: (data: CompanySetupData) => void
}

/* ─── Storage keys ───────────────────────────────────────── */

const TOKEN_KEY = 'driverguard_auth_token'
const USER_KEY  = 'driverguard_user_data'

/* ─── Context ────────────────────────────────────────────── */

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()

  /* Restore session on boot */
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
      const storedUser  = localStorage.getItem(USER_KEY)  || sessionStorage.getItem(USER_KEY)
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /* Persist user changes back to storage automatically */
  const persistUser = useCallback((updatedUser: User, rememberMe = true) => {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(USER_KEY, JSON.stringify(updatedUser))
  }, [])

  /* Handle Google OAuth callback - call this from AuthPage on mount */
  const handleGoogleCallback = useCallback(async (callbackToken: string, rememberMe = true): Promise<boolean> => {
    setIsLoading(true)
    try {
      // Verify the token with backend /api/auth/me
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${backendUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${callbackToken}` }
      })
      
      if (!res.ok) {
        throw new Error('Invalid token from Google OAuth')
      }
      
      const data = await res.json()
      if (!data.success || !data.user) {
        throw new Error('Failed to get user from token')
      }

      const authUser: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        company: data.user.company,
        role: data.user.role,
        avatar: data.user.avatar,
        accountType: data.user.account_type,
        isFirstLogin: data.user.is_first_login ?? data.user.isFirstLogin ?? false,
        companySetupComplete: data.user.company_setup_complete ?? data.user.companySetupComplete ?? false,
      }

      setToken(callbackToken)
      setUser(authUser)

      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem(TOKEN_KEY, callbackToken)
      persistUser(authUser, rememberMe)

      setIsLoading(false)
      toast.success('Authenticated via Google', `Welcome, ${authUser.name}!`)
      return true
    } catch (error) {
      setIsLoading(false)
      toast.error('Google Auth Failed', error instanceof Error ? error.message : 'Unknown error')
      return false
    }
  }, [persistUser, toast])

  /* ── Login ─────────────────────────────────────────────── */
  const login = async (email: string, _pass: string, rememberMe = true): Promise<boolean> => {
    setIsLoading(true)
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    
    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: _pass })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login failed')
      }

      const authUser: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        company: data.user.company,
        role: data.user.role,
        avatar: data.user.avatar,
        accountType: data.user.account_type,
        isFirstLogin: data.user.is_first_login ?? data.user.isFirstLogin ?? false,
        companySetupComplete: data.user.company_setup_complete ?? data.user.companySetupComplete ?? false,
      }

      setToken(data.token)
      setUser(authUser)

      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem(TOKEN_KEY, data.token)
      persistUser(authUser, rememberMe)

      setIsLoading(false)
      toast.success('Welcome Back!', `Logged in as ${authUser.name}`)
      return true
    } catch (error) {
      setIsLoading(false)
      toast.error('Login Failed', error instanceof Error ? error.message : 'Unknown error')
      return false
    }
  }

  /* ── Signup ────────────────────────────────────────────── */
  const signup = async (name: string, company: string, email: string, _pass: string): Promise<boolean> => {
    setIsLoading(true)
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    
    try {
      const res = await fetch(`${backendUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, email, password: _pass })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Signup failed')
      }

      const authUser: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        company: data.user.company,
        role: data.user.role,
        avatar: data.user.avatar,
        accountType: data.user.account_type,
        isFirstLogin: data.user.is_first_login ?? data.user.isFirstLogin ?? false,
        companySetupComplete: data.user.company_setup_complete ?? data.user.companySetupComplete ?? false,
      }

      setToken(data.token)
      setUser(authUser)
      localStorage.setItem(TOKEN_KEY, data.token)
      persistUser(authUser)

      setIsLoading(false)
      toast.success('Account Created!', `Welcome to DriverGuard AI, ${name}!`)
      return true
    } catch (error) {
      setIsLoading(false)
      toast.error('Signup Failed', error instanceof Error ? error.message : 'Unknown error')
      return false
    }
  }

  /* ── Google login ──────────────────────────────────────── */
  const loginWithGoogle = async (): Promise<boolean> => {
    // Navigate to backend Google OAuth endpoint - this will redirect to Google
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    window.location.href = `${backendUrl}/api/auth/google`
    // Note: This function won't return as the page will redirect
    // The callback is handled by handleGoogleCallback on the /auth page
    return new Promise(() => {}) // Never resolves - page redirects
  }

  /* ── Forgot password ───────────────────────────────────── */
  const forgotPassword = async (email: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 600))
    toast.info('Reset Link Sent', `Instructions sent to ${email}`)
    return true
  }

  /* ── Set account type (called from onboarding) ─────────── */
  const setAccountType = useCallback((type: AccountType) => {
    setUser(prev => {
      if (!prev) return prev
      const updated: User = { ...prev, accountType: type, isFirstLogin: false }
      if (localStorage.getItem(USER_KEY)) persistUser(updated, true)
      else persistUser(updated, false)
      return updated
    })
  }, [persistUser])

  /* ── Complete company setup (business onboarding) ─────────── */
  const completeCompanySetup = useCallback((data: CompanySetupData) => {
    setUser(prev => {
      if (!prev) return prev
      const updated: User = {
        ...prev,
        company: data.companyName,
        companySetupComplete: true,
      }
      if (localStorage.getItem(USER_KEY)) persistUser(updated, true)
      else persistUser(updated, false)
      return updated
    })
  }, [persistUser])

  /* ── Logout ────────────────────────────────────────────── */
  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    toast.info('Logged Out', 'You have been safely signed out.')
  }

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
