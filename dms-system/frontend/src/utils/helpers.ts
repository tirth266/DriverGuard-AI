import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

export function formatTimestamp(timestamp: number | string): string {
  const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString([], { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-danger-400 bg-danger-500/20 border-danger-500/30'
    case 'warning': return 'text-warning-400 bg-warning-500/20 border-warning-500/30'
    case 'info': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
    default: return 'text-dark-400 bg-dark-700 border-dark-600'
  }
}

export function getSeverityBgColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-danger-500/20'
    case 'warning': return 'bg-warning-500/20'
    case 'info': return 'bg-blue-500/20'
    default: return 'bg-dark-700'
  }
}

export function getAlertIcon(type: string): string {
  const icons: Record<string, string> = {
    drowsiness: '😴',
    eyes_closed: '🙈',
    eyes_off_road: '👀',
    phone_usage: '📱',
    smoking: '🚬',
    seat_belt_missing: '🔴',
    face_missing: '👤',
    low_light: '🌙',
    camera_blocked: '📷',
    yawning: '😮',
    head_pose: '🔄',
  }
  return icons[type] || '⚠️'
}

export function getSafetyScoreColor(score: number): string {
  if (score >= 80) return 'text-success-400'
  if (score >= 60) return 'text-warning-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-danger-400'
}

export function getSafetyScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-success-500/20'
  if (score >= 60) return 'bg-warning-500/20'
  if (score >= 40) return 'bg-orange-500/20'
  return 'bg-danger-500/20'
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}