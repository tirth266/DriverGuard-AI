export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: UserRole
  is_active: boolean
  is_verified: boolean
  avatar_url: string | null
  created_at: string
  last_login: string | null
}

export type UserRole = 'admin' | 'driver' | 'manager'

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
}

export interface AuthResponse {
  message: string
  user: User
  access_token: string
  refresh_token: string
}

export interface Trip {
  id: number
  user_id: number
  start_time: string
  end_time: string | null
  start_location: string | null
  end_location: string | null
  distance_km: number
  duration_seconds: number
  safety_score: number
  total_blinks: number
  total_yawns: number
  drowsiness_events: number
  eyes_off_road_events: number
  phone_usage_events: number
  smoking_events: number
  seat_belt_violations: number
  created_at: string
}

export interface DetectionData {
  timestamp: number
  face_detected: boolean
  blink_detected: boolean
  yawn_detected: boolean
  drowsiness_detected: boolean
  eyes_closed_detected: boolean
  eyes_on_road: boolean
  phone_detected: boolean
  smoking_detected: boolean
  seat_belt_detected: boolean
  head_pitch: number
  head_yaw: number
  head_roll: number
  ear_left: number
  ear_right: number
  ear_avg: number
  mar: number
  brightness: number
  fps: number
  confidence_score: number
  blink_counter: number
  yawn_counter: number
  alerts: Alert[]
  processing_time_ms: number
}

export interface Alert {
  id?: number
  type: AlertType
  severity: AlertSeverity
  message: string
  confidence: number
  timestamp: number
  metadata?: Record<string, any>
}

export type AlertType = 
  | 'drowsiness'
  | 'eyes_closed'
  | 'eyes_off_road'
  | 'phone_usage'
  | 'smoking'
  | 'seat_belt_missing'
  | 'face_missing'
  | 'low_light'
  | 'camera_blocked'
  | 'yawning'
  | 'head_pose'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface CameraSettings {
  id: number
  user_id: number
  camera_id: string | null
  width: number
  height: number
  fps: number
  mirror: boolean
  auto_start: boolean
  created_at: string
  updated_at: string
}

export interface CameraDevice {
  deviceId: string
  label: string
  kind: 'videoinput'
}

export interface WebSocketMessage {
  event: string
  data: any
}

export interface DetectionResult {
  frame: string
  detections: DetectionData
  stats: DetectionStats
}

export interface DetectionStats {
  blink_counter: number
  yawn_counter: number
  drowsiness_counter: number
  eyes_closed_counter: number
  face_missing_counter: number
  eyes_off_road_counter: number
  current_fps: number
  detection_history_length: number
}

export interface SafetyScoreData {
  score: number
  trip: Trip | null
}

export interface AlertSummary {
  last_24_hours: PeriodSummary
  last_7_days: PeriodSummary
  last_30_days: PeriodSummary
  total_unacknowledged: number
}

export interface PeriodSummary {
  total: number
  by_severity: {
    info: number
    warning: number
    critical: number
  }
  by_type: Record<string, number>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  pages: number
  current_page: number
}

export interface ApiError {
  error: string
  message?: string
  statusCode?: number
}