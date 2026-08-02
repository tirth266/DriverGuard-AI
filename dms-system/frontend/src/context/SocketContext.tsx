import React, { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react'
import { socketService } from '@/services/socket'
import { useAuth } from './AuthContext'

interface SocketContextType {
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  sendFrame: (frameData: string) => void
  resetCounters: () => void
  getStats: () => void
  onDetectionResult: (callback: (data: any) => void) => () => void
  onStats: (callback: (data: any) => void) => () => void
  onError: (callback: (data: any) => void) => () => void
  onStreamStarted: (callback: (data: any) => void) => () => void
  onStreamStopped: (callback: (data: any) => void) => () => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const isConnectedRef = useRef(false)
  const cleanupFnsRef = useRef<(() => void)[]>([])

  const connect = useCallback(async () => {
    if (!user || isConnectedRef.current) return
    
    try {
      await socketService.connect(user.id)
      isConnectedRef.current = true
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
      isConnectedRef.current = false
    }
  }, [user])

  const disconnect = useCallback(() => {
    cleanupFnsRef.current.forEach(fn => fn())
    cleanupFnsRef.current = []
    socketService.disconnect()
    isConnectedRef.current = false
  }, [])

  useEffect(() => {
    if (isAuthenticated && user) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [isAuthenticated, user, connect, disconnect])

  const sendFrame = useCallback((frameData: string) => {
    socketService.sendFrame(frameData)
  }, [])

  const resetCounters = useCallback(() => {
    socketService.resetCounters()
  }, [])

  const getStats = useCallback(() => {
    socketService.getStats()
  }, [])

  const subscribe = useCallback(<T>(event: string, callback: (data: T) => void) => {
    const unsubscribe = socketService.on<T>(event, callback)
    cleanupFnsRef.current.push(unsubscribe)
    return unsubscribe
  }, [])

  const onDetectionResult = useCallback((callback: (data: any) => void) => {
    return subscribe('detection_result', callback)
  }, [subscribe])

  const onStats = useCallback((callback: (data: any) => void) => {
    return subscribe('stats', callback)
  }, [subscribe])

  const onError = useCallback((callback: (data: any) => void) => {
    return subscribe('error', callback)
  }, [subscribe])

  const onStreamStarted = useCallback((callback: (data: any) => void) => {
    return subscribe('stream_started', callback)
  }, [subscribe])

  const onStreamStopped = useCallback((callback: (data: any) => void) => {
    return subscribe('stream_stopped', callback)
  }, [subscribe])

  return (
    <SocketContext.Provider value={{
      isConnected: isConnectedRef.current,
      connect,
      disconnect,
      sendFrame,
      resetCounters,
      getStats,
      onDetectionResult,
      onStats,
      onError,
      onStreamStarted,
      onStreamStopped,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}