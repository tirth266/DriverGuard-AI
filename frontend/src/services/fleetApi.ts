/**
 * Fleet API Service
 * Calls backend fleet management endpoints.
 */

import type { SessionSummary } from './sessionSummary'
import { restoreSession } from './authStorage'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
export const buildApiUrl = (path: string) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

export class ApiError extends Error {
  status: number
  /**
   * The parsed error body, when there was one.
   *
   * The backend puts its machine-readable reason at the top level of the JSON
   * (`reason`), not under a `data` field, so callers read it from here rather
   * than from the message text.
   */
  data: Record<string, unknown> | null
  constructor(message: string, status: number, data: Record<string, unknown> | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/**
 * Called when the server rejects the session, so the app can end it once.
 *
 * A single registered handler rather than a logout at every call site: the
 * 20 FPS frame loop and a dozen pages all receive the same 401, and a logout
 * per response would race and re-enter the auth context many times over.
 */
let onSessionExpired: ((reason: string) => void) | null = null

export function setSessionExpiredHandler(handler: ((reason: string) => void) | null): void {
  onSessionExpired = handler
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = restoreSession()?.token
  if (import.meta.env.DEV) {
    console.debug('[AuthDiag] token_found:', Boolean(token), 'auth_header_attached:', Boolean(token))
  }
  if (!token) throw new ApiError('No authentication token', 401)

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    const message = error?.detail || error?.message || `HTTP ${response.status}`

    // An expired or revoked token must end the session, or every caller retries
    // against a token the server will never accept again.
    if (response.status === 401) onSessionExpired?.(message)

    throw new ApiError(message, response.status, error)
  }

  return response.json()
}

export interface Company {
  id: number
  name: string
  fleet_size: string | null
  country: string | null
  industry: string | null
  owner_id: number
  created_at: string | null
  updated_at: string | null
}

export interface Driver {
  id: number
  company_id: number
  user_id: number | null
  employee_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  gender: string | null
  license_number: string | null
  license_expiry: string | null
  experience_years: number | null
  driver_type: string | null
  assigned_vehicle_id: number | null
  vehicle_number: string | null
  department: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  photo_url: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export interface Vehicle {
  id: number
  company_id: number
  vehicle_number: string
  registration_number: string | null
  vehicle_type: string | null
  manufacturer: string | null
  model: string | null
  year: string | null
  color: string | null
  vin_number: string | null
  assigned_driver_id: number | null
  department: string | null
  insurance_company: string | null
  policy_number: string | null
  insurance_expiry: string | null
  status: string
  created_at: string | null
  updated_at: string | null
}

/**
 * Fields shared by the fleet list endpoints.
 *
 * `page` / `page_size` are absent from the backend's empty-company early return
 * (fleet routes return `{ success, drivers|vehicles, total }` there), so they are
 * optional to match what is actually sent.
 */
export interface PaginatedMeta {
  success: boolean
  total: number
  page?: number
  page_size?: number
}

/** GET /api/fleet/drivers — the collection is keyed `drivers`, not `items`. */
export interface PaginatedDrivers extends PaginatedMeta {
  drivers: Driver[]
}

/** GET /api/fleet/vehicles — the collection is keyed `vehicles`, not `items`. */
export interface PaginatedVehicles extends PaginatedMeta {
  vehicles: Vehicle[]
}

// ── Ride API ──────────────────────────────────────────────────────────────────

/** GPS point as the ride endpoints accept it: coordinates required, rest optional. */
export interface RideLocation {
  latitude: number
  longitude: number
  accuracy?: number | null
  timestamp?: string | null
}

/**
 * A ride as `RideService.ride_to_dict` emits it.
 *
 * The ride identifier is `id`, not `ride_id`: `ride_id` only appears on nested
 * events. Statuses are the lower-cased enum values: active | completed | cancelled.
 *
 * `final_score`, `grade` and `session_summary` are written when the ride is
 * ended and stay null for a ride that was never scored, which is how a ride with
 * no measurable report is told apart from a genuinely clean one.
 */
export interface Ride {
  id: number
  user_id: number
  // Null for a personal ride: it belongs to its owner and has no driver, vehicle
  // or company attached. A fleet ride has all three set.
  driver_id: number | null
  vehicle_id: number | null
  company_id: number | null
  start_time: string | null
  end_time: string | null
  status: string
  duration_seconds: number | null
  event_count: number
  final_score: number | null
  grade: string | null
  session_summary: SessionSummary | null
  events: RideEvent[]
}

export interface RideEvent {
  id: number
  ride_id: number
  event_type: string
  source: string
  start_timestamp: string | null
  end_timestamp: string | null
  duration_seconds: number | null
  max_confidence: number | null
  min_score: number | null
  avg_score: number | null
}

export const RIDE_STATUS_ACTIVE = 'active'

export const rideApi = {
  /**
   * POST /api/rides/ — creates an ACTIVE ride and returns it.
   *
   * The trailing slash is deliberate: the collection routes are declared as `'/``
   * under the `/api/rides` prefix, so the slashless path only resolves through a
   * 307 redirect.
   *
   * Sending no `driver_id`/`vehicle_id` starts a **personal** ride, which the
   * server accepts only for an account that owns no company and returns with all
   * three ride columns null. Sending both starts a **fleet** ride; the server
   * resolves both against the caller's own companies and refuses ids that are
   * missing, foreign, or from two different fleets. Sending only one is refused.
   */
  async start(data: { driver_id?: number; vehicle_id?: number; start_location?: RideLocation }): Promise<{ success: boolean; ride: Ride }> {
    return fetchWithAuth(buildApiUrl('/api/rides/'), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * POST /api/rides/{rideId}/end — completes a ride and closes its open events.
   *
   * The server finalizes the ride before it answers: it closes the events that
   * were still open, freezes the session that scored it and stores that session's
   * final report on the ride. So a resolved call means the ride is complete and
   * its report is durable, and the response already carries it — no second read
   * of the live session is needed or safe.
   */
  async end(rideId: number, data: { end_location?: RideLocation | null } = {}): Promise<{ success: boolean; ride: Ride; session_summary: SessionSummary | null }> {
    return fetchWithAuth(buildApiUrl(`/api/rides/${rideId}/end`), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * GET /api/rides/{rideId} — a single ride, including its stored final report.
   *
   * This is what the ride summary page reads. The report is keyed on the ride, so
   * reloading or deep-linking the page returns the same score the ride finished
   * on, instead of whatever the live session happens to hold.
   */
  async get(rideId: number): Promise<{ success: boolean; ride: Ride }> {
    return fetchWithAuth(buildApiUrl(`/api/rides/${rideId}`))
  },

  /** GET /api/rides/ — the caller's rides, newest first. */
  async list(): Promise<{ success: boolean; rides: Ride[] }> {
    return fetchWithAuth(buildApiUrl('/api/rides/'))
  },
}

// ── Settings API ──────────────────────────────────────────────────────────────

/**
 * The settings record as `GET/PUT /api/settings` stores it.
 *
 * These values are persisted per account. The backend's detection thresholds,
 * audio behaviour and digests are fixed constants, so persisting a preference
 * here does not change what the pipeline does — see Settings.tsx.
 */
export interface UserSettings {
  drowsiness_sensitivity: string
  voice_alerts_enabled: boolean
  email_digest_enabled: boolean
}

export const settingsApi = {
  async get(): Promise<{ success: boolean; settings: UserSettings }> {
    return fetchWithAuth(buildApiUrl('/api/settings/'))
  },

  async update(preferences: Partial<UserSettings>): Promise<{ success: boolean; settings: UserSettings }> {
    return fetchWithAuth(buildApiUrl('/api/settings/'), {
      method: 'PUT',
      body: JSON.stringify(preferences),
    })
  },
}

// ── Company API ──────────────────────────────────────────────────────────────

export const companyApi = {
  async create(data: { name: string; fleet_size?: string; country?: string; industry?: string }): Promise<{ success: boolean; company: Company }> {
    return fetchWithAuth(buildApiUrl('/api/fleet/company'), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async get(): Promise<{ success: boolean; company: Company | null }> {
    return fetchWithAuth(buildApiUrl('/api/fleet/company'))
  },

  async update(data: Partial<Company>): Promise<{ success: boolean; company: Company }> {
    return fetchWithAuth(buildApiUrl('/api/fleet/company'), {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
}

// ── Driver API ────────────────────────────────────────────────────────────────

export const driverApi = {
  async create(data: {
    full_name: string
    email: string
    phone?: string
    employee_id?: string
    date_of_birth?: string
    gender?: string
    license_number?: string
    license_expiry?: string
    experience_years?: number
    driver_type?: string
    vehicle_number?: string
    department?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    emergency_contact_relationship?: string
    photo_url?: string
  }): Promise<{ success: boolean; driver: Driver }> {
    return fetchWithAuth(buildApiUrl('/api/fleet/drivers'), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async list(page = 1, pageSize = 20): Promise<PaginatedDrivers> {
    return fetchWithAuth(buildApiUrl(`/api/fleet/drivers?page=${page}&page_size=${pageSize}`))
  },

  async get(id: number): Promise<{ success: boolean; driver: Driver }> {
    return fetchWithAuth(buildApiUrl(`/api/fleet/drivers/${id}`))
  },

  async update(id: number, data: Partial<Driver>): Promise<{ success: boolean; driver: Driver }> {
    return fetchWithAuth(buildApiUrl(`/api/fleet/drivers/${id}`), {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async delete(id: number): Promise<{ success: boolean; message: string }> {
    return fetchWithAuth(buildApiUrl(`/api/fleet/drivers/${id}`), {
      method: 'DELETE',
    })
  },
}

// ── Vehicle API ────────────────────────────────────────────────────────────────

export const vehicleApi = {
  async create(data: {
    vehicle_number: string
    registration_number?: string
    vehicle_type?: string
    manufacturer?: string
    model?: string
    year?: string
    color?: string
    vin_number?: string
    department?: string
    insurance_company?: string
    policy_number?: string
    insurance_expiry?: string
    status?: string
  }): Promise<{ success: boolean; vehicle: Vehicle }> {
    return fetchWithAuth(buildApiUrl('/api/fleet/vehicles'), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async list(page = 1, pageSize = 20): Promise<PaginatedVehicles> {
    return fetchWithAuth(buildApiUrl(`/api/fleet/vehicles?page=${page}&page_size=${pageSize}`))
  },

  async get(id: number): Promise<{ success: boolean; vehicle: Vehicle }> {
    return fetchWithAuth(buildApiUrl(`/api/fleet/vehicles/${id}`))
  },

  async update(id: number, data: Partial<Vehicle>): Promise<{ success: boolean; vehicle: Vehicle }> {
    return fetchWithAuth(buildApiUrl(`/api/fleet/vehicles/${id}`), {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async delete(id: number): Promise<{ success: boolean; message: string }> {
    return fetchWithAuth(buildApiUrl(`/api/fleet/vehicles/${id}`), {
      method: 'DELETE',
    })
  },
}
