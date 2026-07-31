import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useToast } from './ToastContext'

export interface User {
  id: string
  name: string
  email: string
  company: string
  avatar?: string
  role?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>
  signup: (name: string, company: string, email: string, password: string) => Promise<boolean>
  loginWithGoogle: () => Promise<boolean>
  logout: () => void
  forgotPassword: (email: string) => Promise<boolean>
}

const AUTH_TOKEN_KEY = 'driverguard_auth_token'
const AUTH_USER_KEY = 'driverguard_user_data'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper to generate mock JWT token
function generateMockJWT(user: User): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    })
  )
  const signature = 'sA7x9_mK3vQ1ZpL5wR8yT2nB4'
  return `${header}.${payload}.${signature}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const toast = useToast()

  // Initialize session from storage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY)
      const storedUser = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY)

      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    } catch (e) {
      console.error('Failed to restore auth session:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Manual Sign In
  const login = async (email: string, password: string, rememberMe: boolean = true): Promise<boolean> => {
    setIsLoading(true)
    // Simulate API network latency
    await new Promise((resolve) => setTimeout(resolve, 800))

    if (password === 'wrong') {
      setIsLoading(false)
      toast.error('Authentication Failed', 'Invalid password. Please check your credentials.')
      return false
    }

    // Derive name from email if not existing
    const namePart = email.split('@')[0]
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/[._]/g, ' ')

    const authenticatedUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: formattedName || 'Fleet Operator',
      email: email.toLowerCase(),
      company: 'Global Fleet Logistics',
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`,
      role: 'Fleet Manager',
    }

    const jwtToken = generateMockJWT(authenticatedUser)

    setUser(authenticatedUser)
    setToken(jwtToken)

    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(AUTH_TOKEN_KEY, jwtToken)
    storage.setItem(AUTH_USER_KEY, JSON.stringify(authenticatedUser))

    setIsLoading(false)
    toast.success(`Welcome back, ${authenticatedUser.name}!`, 'Access granted to fleet dashboard.')
    return true
  }

  // Manual Sign Up
  const signup = async (
    name: string,
    company: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Check mock existing user
    if (email.toLowerCase() === 'test@exists.com') {
      setIsLoading(false)
      toast.error('Account Conflict', 'An account with this email address already exists.')
      return false
    }

    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      company: company.trim(),
      avatar: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80`,
      role: 'Company Administrator',
    }

    const jwtToken = generateMockJWT(newUser)

    setUser(newUser)
    setToken(jwtToken)

    localStorage.setItem(AUTH_TOKEN_KEY, jwtToken)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser))

    setIsLoading(false)
    toast.success('Account Created!', `Welcome to DriverGuard AI, ${newUser.name}.`)
    return true
  }

  // Google OAuth Login
  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 900))

    const googleUser: User = {
      id: 'usr_g_' + Math.random().toString(36).substring(2, 9),
      name: 'Sarah Connor',
      email: 'sarah.connor@skyfleet.io',
      company: 'Skyline Transit Operators',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      role: 'Enterprise Administrator',
    }

    const jwtToken = generateMockJWT(googleUser)

    setUser(googleUser)
    setToken(jwtToken)

    localStorage.setItem(AUTH_TOKEN_KEY, jwtToken)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(googleUser))

    setIsLoading(false)
    toast.success(`Signed in with Google as ${googleUser.email}`, 'Redirecting to your live dashboard.')
    return true
  }

  // Logout
  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
    sessionStorage.removeItem(AUTH_USER_KEY)
    setUser(null)
    setToken(null)
    toast.info('Logged Out', 'You have been safely logged out.')
  }

  // Forgot Password
  const forgotPassword = async (email: string): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    toast.success('Password Reset Link Sent', `Instructions have been sent to ${email}.`)
    return true
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        signup,
        loginWithGoogle,
        logout,
        forgotPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
