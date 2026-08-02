import React from 'react'
import { cn, formatDuration, formatDateTime, getSeverityColor } from '@/utils/helpers'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface TripSummaryProps {
  trip: any
  onEndTrip: () => void
  isActive: boolean
}

export const TripSummary = ({ trip, onEndTrip, isActive }: TripSummaryProps) => {
  if (!trip) {
    return (
      <Card>
        <div className="text-center py-8">
          <svg className="w-16 h-16 mx-auto mb-4 text-dark-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-lg font-medium text-dark-300">No Active Trip</p>
          <p className="text-sm text-dark-500 mt-1">Start a trip to begin monitoring</p>
        </div>
      </Card>
    )
  }

  const duration = trip.end_time 
    ? Math.floor((new Date(trip.end_time).getTime() - new Date(trip.start_time).getTime()) / 1000)
    : Math.floor((Date.now() - new Date(trip.start_time).getTime()) / 1000)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-dark-100">Active Trip</h3>
          <p className="text-sm text-dark-400">Started {formatDateTime(trip.start_time)}</p>
        </div>
        {isActive && (
          <Button variant="danger" size="sm" onClick={onEndTrip}>
            End Trip
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 rounded-lg bg-dark-800/50">
          <p className="text-2xl font-bold text-dark-100 font-mono">{formatDuration(duration)}</p>
          <p className="text-xs text-dark-400">Duration</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-dark-800/50">
          <p className="text-2xl font-bold text-dark-100">{trip.distance_km.toFixed(1)}</p>
          <p className="text-xs text-dark-400">Distance (km)</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-dark-800/50">
          <p className="text-2xl font-bold text-primary-400">{trip.safety_score.toFixed(0)}</p>
          <p className="text-xs text-dark-400">Safety Score</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatItem label="Blinks" value={trip.total_blinks} color="primary" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
        <StatItem label="Yawns" value={trip.total_yawns} color="warning" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>} />
        <StatItem label="Drowsy" value={trip.drowsiness_events} color="danger" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
        <StatItem label="Eyes Off" value={trip.eyes_off_road_events} color="warning" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>} />
      </div>

      {trip.end_time && (
        <div className="mt-4 p-3 rounded-lg bg-dark-800/50 border border-dark-700">
          <p className="text-sm text-dark-400">
            Trip ended at {formatDateTime(trip.end_time)} • Duration: {formatDuration(duration)}
          </p>
        </div>
      )}
    </Card>
  )
}

interface StatItemProps {
  label: string
  value: number
  color: 'primary' | 'success' | 'warning' | 'danger'
  icon: React.ReactNode
}

const StatItem = ({ label, value, color, icon }: StatItemProps) => {
  const colorConfig = {
    primary: 'text-primary-400',
    success: 'text-success-400',
    warning: 'text-warning-400',
    danger: 'text-danger-400',
  }

  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-dark-800/50">
      <div className={cn('p-2 rounded-lg', colorConfig[color], 'bg-opacity-10')}>
        {icon}
      </div>
      <p className="text-xl font-bold text-dark-100">{value}</p>
      <p className="text-xs text-dark-400">{label}</p>
    </div>
  )
}

interface DriverInfoProps {
  user: any
}

export const DriverInfo = ({ user }: DriverInfoProps) => {
  if (!user) return null

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary-500/20 flex items-center justify-center">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-xl object-cover" />
          ) : (
            <span className="text-2xl font-bold text-primary-400">
              {user.first_name[0]}{user.last_name[0]}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-dark-100 truncate">{user.full_name}</h3>
          <p className="text-sm text-dark-400 truncate">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="primary" size="sm">{user.role}</Badge>
            <Badge variant={user.is_verified ? 'success' : 'warning'} size="sm">
              {user.is_verified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  )
}

interface CameraControlsProps {
  cameras: { deviceId: string; label: string }[]
  selectedCamera: string | null
  onCameraSelect: (deviceId: string) => void
  mirror: boolean
  onMirrorToggle: () => void
  isActive: boolean
  onStart: () => void
  onStop: () => void
  onSnapshot: () => void
  onToggleRecording: () => void
  isRecording: boolean
  onFullscreen: () => void
  isFullscreen: boolean
}

export const CameraControls = ({
  cameras,
  selectedCamera,
  onCameraSelect,
  mirror,
  onMirrorToggle,
  isActive,
  onStart,
  onStop,
  onSnapshot,
  onToggleRecording,
  isRecording,
  onFullscreen,
  isFullscreen,
}: CameraControlsProps) => {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-dark-100 mb-4">Camera Controls</h3>
      
      <div className="space-y-4">
        <div>
          <label className="label">Camera Source</label>
          <select
            value={selectedCamera || ''}
            onChange={(e) => e.target.value && onCameraSelect(e.target.value)}
            disabled={!isActive}
            className="input"
          >
            <option value="">Select Camera</option>
            {cameras.map(cam => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={isActive ? 'danger' : 'success'}
            onClick={isActive ? onStop : onStart}
            className="flex-1"
            leftIcon={isActive ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            )}
          >
            {isActive ? 'Stop Camera' : 'Start Camera'}
          </Button>
          
          <Button
            variant="ghost"
            size="md"
            onClick={onMirrorToggle}
            className={cn('rounded-lg', mirror && 'bg-primary-500/20 text-primary-400')}
            aria-pressed={mirror}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onSnapshot} className="flex-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Snapshot
          </Button>
          
          <Button 
            variant={isRecording ? 'danger' : 'secondary'} 
            size="sm" 
            onClick={onToggleRecording} 
            className="flex-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
            {isRecording ? 'Stop Recording' : 'Record'}
          </Button>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onFullscreen} 
          className="w-full"
          leftIcon={isFullscreen ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          )}
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </Button>
      </div>
    </Card>
  )
}