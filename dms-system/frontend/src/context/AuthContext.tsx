import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { User, AuthState, AuthResponse } from '@/types'
import { api } from '@/services/api'

interface AuthContextType extends AuthState {
  login: (credentials: { email: string; password: string }) => Promise<AuthResponse>
  register: (data: { email: string; password: string; first_name: string; last_name: string }) => Promise<AuthResponse>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  setTokens: (accessToken: string, refreshToken: string) => void
  clearAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  })

  const initializeAuth = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    
    if (accessToken && refreshToken) {
      api.setTokens(accessToken, refreshToken)
      try {
        const user = await api.getCurrentUser()
        setState({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        })
      } catch (error) {
        api.clearTokens()
        setState(prev => ({ ...prev, isLoading: false }))
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  const login = async (credentials: { email: string; password: string }) => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      const response = await api.login(credentials)
      setState({
        user: response.user,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      })
      return response
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const register = async (data: { email: string; password: string; first_name: string; last_name: string }) => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      const response = await api.register(data)
      setState({
        user: response.user,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      })
      return response
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const logout = async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      await api.logout()
    } finally {
      api.clearTokens()
      setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  }

  const refreshUser = async () => {
    try {
      const user = await api.getCurrentUser()
      setState(prev => ({ ...prev, user }))
    } catch (error) {
      await logout()
    }
  }

  const setTokens = (accessToken: string, refreshToken: string) => {
    api.setTokens(accessToken, refreshToken)
    setState(prev => ({
      ...prev,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    }))
  }

  const clearAuth = () => {
    api.clearTokens()
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser, setTokens, clearAuth }}>
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