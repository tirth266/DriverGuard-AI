import { io, Socket } from 'socket.io-client'
import type { DetectionResult, DetectionStats } from '@/types'

type EventCallback<T = any> = (data: T) => void

class SocketService {
  private socket: Socket | null = null
  private eventHandlers: Map<string, Set<EventCallback>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        this.joinUserRoom(userId)
        resolve()
        return
      }

      const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000'
      
      this.socket = io(wsUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 20000,
      })

      this.socket.on('connect', () => {
        console.log('WebSocket connected:', this.socket?.id)
        this.reconnectAttempts = 0
        this.joinUserRoom(userId)
        this.emit('start_stream', { user_id: userId })
        resolve()
      })

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason)
      })

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        this.reconnectAttempts++
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'))
        }
      })

      this.socket.on('connected', (data) => {
        console.log('Server connected:', data)
      })

      this.socket.on('stream_started', (data) => {
        console.log('Stream started:', data)
        this.emitEvent('stream_started', data)
      })

      this.socket.on('stream_stopped', (data) => {
        console.log('Stream stopped:', data)
        this.emitEvent('stream_stopped', data)
      })

      this.socket.on('detection_result', (data: DetectionResult) => {
        this.emitEvent('detection_result', data)
      })

      this.socket.on('stats', (data: DetectionStats) => {
        this.emitEvent('stats', data)
      })

      this.socket.on('counters_reset', (data) => {
        this.emitEvent('counters_reset', data)
      })

      this.socket.on('error', (data: { message: string }) => {
        console.error('Server error:', data.message)
        this.emitEvent('error', data)
      })

      this.socket.on('pong', (data) => {
        this.emitEvent('pong', data)
      })
    })
  }

  private joinUserRoom(userId: number) {
    if (this.socket?.connected) {
      this.socket.emit('join_room', `user_${userId}`)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.emit('stop_stream')
      this.socket.disconnect()
      this.socket = null
    }
  }

  sendFrame(frameData: string) {
    if (this.socket?.connected) {
      this.socket.emit('frame', { frame: frameData })
    }
  }

  resetCounters() {
    if (this.socket?.connected) {
      this.socket.emit('reset_counters')
    }
  }

  getStats() {
    if (this.socket?.connected) {
      this.socket.emit('get_stats')
    }
  }

  ping() {
    if (this.socket?.connected) {
      this.socket.emit('ping')
    }
  }

  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(callback)
    
    return () => this.off(event, callback)
  }

  off<T = any>(event: string, callback: EventCallback<T>) {
    this.eventHandlers.get(event)?.delete(callback)
  }

  private emitEvent<T = any>(event: string, data: T) {
    this.eventHandlers.get(event)?.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in ${event} handler:`, error)
      }
    })
  }

  private emit(event: string, data: any) {
    this.socket?.emit(event, data)
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  getSocketId(): string | undefined {
    return this.socket?.id
  }
}

export const socketService = new SocketService()