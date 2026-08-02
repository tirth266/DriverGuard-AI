import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { 
  AuthResponse, 
  LoginCredentials, 
  RegisterData, 
  User, 
  Trip, 
  DetectionData, 
  Alert, 
  CameraSettings,
  CameraDevice,
  SafetyScoreData,
  AlertSummary,
  PaginatedResponse
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

class ApiService {
  private client: AxiosInstance
  private accessToken: string | null = null
  private refreshToken: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    })

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
        
        if (error.response?.status === 401 && !originalRequest._retry && this.refreshToken) {
          originalRequest._retry = true
          
          try {
            const response = await this.refreshAccessToken()
            this.setTokens(response.access_token, response.refresh_token)
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${this.accessToken}`
            }
            
            return this.client(originalRequest)
          } catch (refreshError) {
            this.clearTokens()
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }
        
        return Promise.reject(error)
      }
    )

    this.loadTokensFromStorage()
  }

  private loadTokensFromStorage() {
    this.accessToken = localStorage.getItem('accessToken')
    this.refreshToken = localStorage.getItem('refreshToken')
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
  }

  clearTokens() {
    this.accessToken = null
    this.refreshToken = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  getAccessToken(): string | null {
    return this.accessToken
  }

  isAuthenticated(): boolean {
    return !!this.accessToken
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', credentials)
    this.setTokens(response.data.access_token, response.data.refresh_token)
    return response.data
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', data)
    this.setTokens(response.data.access_token, response.data.refresh_token)
    return response.data
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout')
    } finally {
      this.clearTokens()
    }
  }

  async refreshAccessToken(): Promise<{ access_token: string; refresh_token: string }> {
    const response = await this.client.post('/auth/refresh', {}, {
      headers: {
        Authorization: `Bearer ${this.refreshToken}`
      }
    })
    return response.data
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<{ user: User }>('/auth/me')
    return response.data.user
  }

  async getGoogleAuthUrl(): Promise<string> {
    const response = await this.client.get<{ auth_url: string }>('/auth/google')
    return response.data.auth_url
  }

  async googleCallback(code: string): Promise<AuthResponse> {
    const response = await this.client.get<AuthResponse>(`/auth/google/callback?code=${code}`)
    this.setTokens(response.data.access_token, response.data.refresh_token)
    return response.data
  }

  async forgotPassword(email: string): Promise<void> {
    await this.client.post('/auth/forgot-password', { email })
  }

  async startTrip(startLocation?: string): Promise<Trip> {
    const response = await this.client.post<{ trip: Trip }>('/video/start_trip', { start_location: startLocation })
    return response.data.trip
  }

  async endTrip(endLocation?: string, distanceKm?: number): Promise<Trip> {
    const response = await this.client.post<{ trip: Trip }>('/video/end_trip', { 
      end_location: endLocation, 
      distance_km: distanceKm 
    })
    return response.data.trip
  }

  async getCurrentTrip(): Promise<Trip | null> {
    const response = await this.client.get<{ trip: Trip | null }>('/video/current_trip')
    return response.data.trip
  }

  async getTrips(page = 1, perPage = 20): Promise<PaginatedResponse<Trip>> {
    const response = await this.client.get<PaginatedResponse<Trip>>(`/video/trips?page=${page}&per_page=${perPage}`)
    return response.data
  }

  async getTrip(tripId: number): Promise<{ trip: Trip; detections: DetectionData[]; alerts: Alert[] }> {
    const response = await this.client.get<{ trip: Trip; detections: DetectionData[]; alerts: Alert[] }>(`/video/trips/${tripId}`)
    return response.data
  }

  async getDetections(tripId: number, page = 1, perPage = 100): Promise<PaginatedResponse<DetectionData>> {
    const response = await this.client.get<PaginatedResponse<DetectionData>>(`/video/detections/${tripId}?page=${page}&per_page=${perPage}`)
    return response.data
  }

  async getCameraSettings(): Promise<CameraSettings> {
    const response = await this.client.get<{ settings: CameraSettings }>('/video/camera_settings')
    return response.data.settings
  }

  async updateCameraSettings(settings: Partial<CameraSettings>): Promise<CameraSettings> {
    const response = await this.client.put<{ settings: CameraSettings }>('/video/camera_settings', settings)
    return response.data.settings
  }

  async getStatus(): Promise<{ 
    active_trip: Trip | null
    current_detection: DetectionData | null
    recent_alerts: Alert[]
    user_id: number
  }> {
    const response = await this.client.get('/status/')
    return response.data
  }

  async getSafetyScore(): Promise<SafetyScoreData> {
    const response = await this.client.get<SafetyScoreData>('/status/safety_score')
    return response.data
  }

  async getAlerts(params?: {
    page?: number
    per_page?: number
    severity?: string
    type?: string
    unacknowledged?: boolean
    trip_id?: number
  }): Promise<PaginatedResponse<Alert>> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value))
      })
    }
    const response = await this.client.get<PaginatedResponse<Alert>>(`/alerts/?${searchParams.toString()}`)
    return response.data
  }

  async acknowledgeAlert(alertId: number): Promise<Alert> {
    const response = await this.client.post<{ alert: Alert }>(`/alerts/${alertId}/acknowledge`)
    return response.data.alert
  }

  async getUnacknowledgedCount(): Promise<number> {
    const response = await this.client.get<{ count: number }>('/alerts/unacknowledged_count')
    return response.data.count
  }

  async getAlertSummary(): Promise<AlertSummary> {
    const response = await this.client.get<AlertSummary>('/alerts/summary')
    return response.data
  }

  async getVideoStreamInfo(): Promise<{ websocket_url: string; config: any }> {
    const response = await this.client.get('/video/stream')
    return response.data
  }
}

export const api = new ApiService()