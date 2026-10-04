/**
 * Fleet API Service
 * Calls backend fleet management endpoints.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
export const buildApiUrl = (path: string) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('driverguard_auth_token') || sessionStorage.getItem('driverguard_auth_token')
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
    throw new ApiError(message, response.status)
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

export interface PaginatedResponse<T> {
  success: boolean
  items: T[]
  total: number
  page: number
  page_size: number
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

  async list(page = 1, pageSize = 20): Promise<PaginatedResponse<Driver>> {
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

  async list(page = 1, pageSize = 20): Promise<PaginatedResponse<Vehicle>> {
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
