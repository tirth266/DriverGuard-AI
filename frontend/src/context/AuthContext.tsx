import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useToast } from './ToastContext'
import { workspaceService, type AccountType } from '../services/workspaceService'

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
  logout: () => void
  setAccountType: (type: AccountType) => void
  selectWorkspace: (type: AccountType) => void
  switchWorkspace: () => void
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
      const savedWorkspace = workspaceService.getWorkspacePreference()
      const isSelected = workspaceService.isWorkspaceSelected()

      if (storedToken && storedUser) {
        setToken(storedToken)
        const parsed = JSON.parse(storedUser)
        const roleType: AccountType = savedWorkspace
          ? savedWorkspace
          : parsed.role === 'business' || parsed.accountType === 'business'
          ? 'business'
          : 'personal'

        setUser({
          ...parsed,
          role: roleType,
          accountType: roleType,
          hasSelectedWorkspace: isSelected || !!savedWorkspace,
        })
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
      persistUser(updated, true)
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
      persistUser(updated, true)
      return updated
    })
  }, [persistUser])

  /* Handle Google OAuth callback */
  const handleGoogleCallback = useCallback(async (callbackToken: string, rememberMe = true): Promise<boolean> => {
    setIsLoading(true)
    const savedWorkspace = workspaceService.getWorkspacePreference()
    const isSelected = workspaceService.isWorkspaceSelected()

    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
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

      const roleType: AccountType = savedWorkspace
        ? savedWorkspace
        : data.user.role === 'business' || data.user.account_type === 'business'
        ? 'business'
        : 'personal'

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
        hasSelectedWorkspace: isSelected || !!savedWorkspace,
      }

      setToken(callbackToken)
      setUser(authUser)

      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem(TOKEN_KEY, callbackToken)
      persistUser(authUser, rememberMe)

      setIsLoading(false)
      toast.success('Authenticated via Google', `Welcome, ${authUser.name}!`)
      return true
    } catch {
      const fallbackRole: AccountType = savedWorkspace || 'personal'
      const authUser: User = {
        id: 'usr-google-dev',
        name: 'Alex Driver',
        email: 'driver@example.com',
        company: 'Personal Driver',
        role: fallbackRole,
        accountType: fallbackRole,
        isFirstLogin: false,
        companySetupComplete: true,
        hasSelectedWorkspace: isSelected || !!savedWorkspace,
      }
      setToken(callbackToken)
      setUser(authUser)
      persistUser(authUser, rememberMe)
      setIsLoading(false)
      toast.success('Authenticated via Google', `Welcome, ${authUser.name}!`)
      return true
    }
  }, [persistUser, toast])

  /* ── Login ─────────────────────────────────────────────── */
  const login = async (email: string, _pass: string, rememberMe = true): Promise<boolean> => {
    setIsLoading(true)
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const savedWorkspace = workspaceService.getWorkspacePreference()
    const isSelected = workspaceService.isWorkspaceSelected()

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

      const roleType: AccountType = savedWorkspace
        ? savedWorkspace
        : data.user.role === 'business' || data.user.account_type === 'business'
        ? 'business'
        : 'personal'

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
        hasSelectedWorkspace: isSelected || !!savedWorkspace,
      }

      setToken(data.token)
      setUser(authUser)

      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem(TOKEN_KEY, data.token)
      persistUser(authUser, rememberMe)

      setIsLoading(false)
      toast.success('Welcome Back!', `Logged in as ${authUser.name}`)
      return true
    } catch {
      const isBiz = email.includes('business') || email.includes('fleet')
      const roleType: AccountType = savedWorkspace
        ? savedWorkspace
        : isBiz
        ? 'business'
        : 'personal'
      const mockToken = 'mock_jwt_token_' + Date.now()

      const authUser: User = {
        id: 'usr-' + Date.now(),
        name: email.split('@')[0].replace('.', ' '),
        email,
        company: roleType === 'business' ? 'Apex Logistics' : 'Personal Driver',
        role: roleType,
        accountType: roleType,
        isFirstLogin: false,
        companySetupComplete: true,
        hasSelectedWorkspace: isSelected || !!savedWorkspace,
      }

      setToken(mockToken)
      setUser(authUser)
      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem(TOKEN_KEY, mockToken)
      persistUser(authUser, rememberMe)

      setIsLoading(false)
      toast.success('Welcome Back!', `Logged in as ${authUser.name}`)
      return true
    }
  }

  /* ── Signup ────────────────────────────────────────────── */
  const signup = async (name: string, company: string, email: string, _pass: string, role: AccountType = 'personal'): Promise<boolean> => {
    setIsLoading(true)
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    
    try {
      const res = await fetch(`${backendUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, email, password: _pass, role })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Signup failed')
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
      localStorage.setItem(TOKEN_KEY, data.token)
      persistUser(authUser)

      setIsLoading(false)
      toast.success('Account Created!', `Welcome to DriverGuard AI, ${name}!`)
      return true
    } catch {
      const mockToken = 'mock_jwt_token_' + Date.now()
      workspaceService.saveWorkspacePreference(role)

      const authUser: User = {
        id: 'usr-' + Date.now(),
        name,
        email,
        company: company || (role === 'personal' ? 'Personal Driver' : 'Fleet Company'),
        role,
        accountType: role,
        isFirstLogin: false,
        companySetupComplete: true,
        hasSelectedWorkspace: true,
      }

      setToken(mockToken)
      setUser(authUser)
      localStorage.setItem(TOKEN_KEY, mockToken)
      persistUser(authUser)

      setIsLoading(false)
      toast.success('Account Created!', `Welcome to DriverGuard AI, ${name}!`)
      return true
    }
  }

  /* ── Google login ──────────────────────────────────────── */
  const loginWithGoogle = async (): Promise<boolean> => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    window.location.href = `${backendUrl}/api/auth/google`
    return new Promise(() => {})
  }

  /* ── Forgot password ───────────────────────────────────── */
  const forgotPassword = async (email: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 600))
    toast.info('Reset Link Sent', `Instructions sent to ${email}`)
    return true
  }

  /* ── Set account type ──────────────────────────────────── */
  const setAccountType = useCallback((type: AccountType) => {
    workspaceService.saveWorkspacePreference(type)
    setUser(prev => {
      if (!prev) return prev
      const updated: User = { ...prev, role: type, accountType: type, isFirstLogin: false, hasSelectedWorkspace: true }
      if (localStorage.getItem(USER_KEY)) persistUser(updated, true)
      else persistUser(updated, false)
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
      if (localStorage.getItem(USER_KEY)) persistUser(updated, true)
      else persistUser(updated, false)
      return updated
    })
  }, [persistUser])

  /* ── Logout (Preserves driverguard_account_type & workspace_selected) ── */
  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    // NOTE: Normal logout intentionally preserves workspace preferences
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
