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
  forgotPassword: (email: string) => Promise<boolean>
  logout: () => void
  setAccountType: (type: AccountType) => void
  completeCompanySetup: (data: CompanySetupData) => void
}

/* ─── Storage keys ───────────────────────────────────────── */

const TOKEN_KEY = 'driverguard_auth_token'
const USER_KEY  = 'driverguard_user_data'

/* ─── Mock defaults ──────────────────────────────────────── */

const MOCK_USER: User = {
  id: 'usr_8921a',
  name: 'Sarah Connor',
  email: 'sarah.connor@skyfleet.io',
  company: 'Skyline Transit Operators',
  role: 'Fleet Manager',
  avatar:
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
  accountType: null,
  isFirstLogin: true,
  companySetupComplete: false,
}

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

  /* ── Login ─────────────────────────────────────────────── */
  const login = async (email: string, _pass: string, rememberMe = true): Promise<boolean> => {
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 800))

    const mockToken = 'mock_driverguard_jwt_token'
    const authUser: User = { ...MOCK_USER, email: email || MOCK_USER.email }

    setToken(mockToken)
    setUser(authUser)

    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(TOKEN_KEY, mockToken)
    persistUser(authUser, rememberMe)

    setIsLoading(false)
    toast.success('Welcome Back!', `Logged in as ${authUser.name}`)
    return true
  }

  /* ── Signup ────────────────────────────────────────────── */
  const signup = async (name: string, company: string, email: string, _pass: string): Promise<boolean> => {
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 1000))

    const mockToken = 'mock_signup_jwt_token'
    const newUser: User = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      name,
      email,
      company,
      role: 'Account Owner',
      accountType: null,
      isFirstLogin: true,
      companySetupComplete: false,
    }

    setToken(mockToken)
    setUser(newUser)
    localStorage.setItem(TOKEN_KEY, mockToken)
    persistUser(newUser)

    setIsLoading(false)
    toast.success('Account Created!', `Welcome to DriverGuard AI, ${name}!`)
    return true
  }

  /* ── Google login ──────────────────────────────────────── */
  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 900))

    const mockToken = 'google_oauth_token'
    const googleUser: User = { ...MOCK_USER, name: 'Sarah Connor' }

    setToken(mockToken)
    setUser(googleUser)
    localStorage.setItem(TOKEN_KEY, mockToken)
    persistUser(googleUser)

    setIsLoading(false)
    toast.success('Authenticated via Google', `Welcome, ${googleUser.name}!`)
    return true
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
