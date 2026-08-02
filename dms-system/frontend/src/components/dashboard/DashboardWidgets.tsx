import React from 'react'
import { cn } from '@/utils/helpers'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Gauge, CircularProgress, StatCard } from '@/components/ui/Progress'

interface SafetyScoreGaugeProps {
  score: number
  size?: number
  showDetails?: boolean
  blinkCount?: number
  yawnCount?: number
  drowsinessEvents?: number
}

export const SafetyScoreGauge = ({ 
  score, 
  size = 200, 
  showDetails = true,
  blinkCount = 0,
  yawnCount = 0,
  drowsinessEvents = 0
}: SafetyScoreGaugeProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e'
    if (score >= 60) return '#f59e0b'
    if (score >= 40) return '#fb923c'
    return '#ef4444'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Poor'
  }

  const color = getScoreColor(score)
  const label = getScoreLabel(score)

  return (
    <Card className="flex-1 min-w-[280px]">
      <div className="flex flex-col items-center">
        <div className="relative">
          <CircularProgress
            value={score}
            size={size}
            strokeWidth={12}
            variant="primary"
            showValue
            className="text-primary-500"
          >
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold" style={{ color }}>
                {score.toFixed(0)}
              </span>
              <span className="text-sm font-medium" style={{ color }}>
                {label}
              </span>
            </div>
          </CircularProgress>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={size / 2 - 12}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeDasharray="4 8"
                opacity="0.1"
                style={{ color }}
              />
            </svg>
          </div>
        </div>
        
        {showDetails && (
          <div className="mt-6 w-full grid grid-cols-3 gap-4">
            <StatCard
              label="Blinks"
              value={blinkCount}
              variant="primary"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
            />
            <StatCard
              label="Yawns"
              value={yawnCount}
              variant="warning"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
            />
            <StatCard
              label="Drowsiness Events"
              value={drowsinessEvents}
              variant={drowsinessEvents > 0 ? 'danger' : 'success'}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            />
          </div>
        )}
      </div>
    </Card>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  status?: 'normal' | 'warning' | 'critical'
  color?: 'primary' | 'success' | 'warning' | 'danger'
}

export const MetricCard = ({ 
  label, 
  value, 
  unit, 
  icon, 
  trend, 
  status = 'normal',
  color = 'primary'
}: MetricCardProps) => {
  const statusColors = {
    normal: 'text-dark-100',
    warning: 'text-warning-400',
    critical: 'text-danger-400',
  }

  const colorConfig = {
    primary: { bg: 'bg-primary-500/10', border: 'border-primary-500/30', text: 'text-primary-400' },
    success: { bg: 'bg-success-500/10', border: 'border-success-500/30', text: 'text-success-400' },
    warning: { bg: 'bg-warning-500/10', border: 'border-warning-500/30', text: 'text-warning-400' },
    danger: { bg: 'bg-danger-500/10', border: 'border-danger-500/30', text: 'text-danger-400' },
  }

  const config = colorConfig[color]

  return (
    <Card className={cn(config.bg, config.border)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-dark-400">{label}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={cn('text-2xl font-bold', statusColors[status])}>
              {value}
            </span>
            {unit && <span className="text-dark-400">{unit}</span>}
          </div>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span className={cn(
                'text-sm font-medium',
                trend.value >= 0 ? 'text-success-400' : 'text-danger-400'
              )}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
              </span>
              <span className="text-xs text-dark-500">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('p-3 rounded-xl', config.bg, config.text)}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

interface DetectionStatusProps {
  detections: any
  isConnected: boolean
  isProcessing: boolean
}

export const DetectionStatus = ({ detections, isConnected, isProcessing }: DetectionStatusProps) => {
  const statusItems = [
    {
      label: 'Face Detected',
      value: detections?.face_detected ? 'Yes' : 'No',
      status: detections?.face_detected ? 'normal' : 'critical',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    },
    {
      label: 'Eyes on Road',
      value: detections?.eyes_on_road ? 'Yes' : 'No',
      status: detections?.eyes_on_road ? 'normal' : 'warning',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    },
    {
      label: 'Drowsiness',
      value: detections?.drowsiness_detected ? 'Detected' : 'None',
      status: detections?.drowsiness_detected ? 'critical' : 'normal',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    },
    {
      label: 'Phone Usage',
      value: detections?.phone_detected ? 'Detected' : 'None',
      status: detections?.phone_detected ? 'critical' : 'normal',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    },
  ]

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-100">Detection Status</h3>
        <div className="flex items-center gap-2">
          <span className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-success-500' : 'bg-danger-500'
          )} />
          <span className="text-sm text-dark-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {statusItems.map((item, index) => (
          <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/50">
            <div className="p-2 rounded-lg bg-dark-900 text-dark-400">
              {item.icon}
            </div>
            <div>
              <p className="text-xs text-dark-400">{item.label}</p>
              <p className={cn('text-sm font-medium', 
                item.status === 'normal' && 'text-success-400',
                item.status === 'warning' && 'text-warning-400',
                item.status === 'critical' && 'text-danger-400'
              )}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

interface HeadPoseIndicatorProps {
  pitch: number
  yaw: number
  roll: number
  size?: number
}

export const HeadPoseIndicator = ({ pitch, yaw, roll, size = 150 }: HeadPoseIndicatorProps) => {
  const center = size / 2
  const radius = center - 20
  
  const noseX = center + Math.sin(yaw * Math.PI / 180) * radius * 0.5
  const noseY = center - Math.sin(pitch * Math.PI / 180) * radius * 0.5

  return (
    <Card>
      <h3 className="text-lg font-semibold text-dark-100 mb-4">Head Pose</h3>
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={2}
          />
          <circle
            cx={center}
            cy={center}
            r={radius * 0.66}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <circle
            cx={center}
            cy={center}
            r={radius * 0.33}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <line
            x1={center}
            y1={center - radius}
            x2={center}
            y2={center + radius}
            stroke="#334155"
            strokeWidth={1}
          />
          <line
            x1={center - radius}
            y1={center}
            x2={center + radius}
            y2={center}
            stroke="#334155"
            strokeWidth={1}
          />
          <circle
            cx={noseX}
            cy={noseY}
            r={8}
            fill="#0ea5e9"
            className="transition-all duration-200"
          />
          <circle
            cx={center + Math.sin((yaw + 30) * Math.PI / 180) * radius * 0.3}
            cy={center - Math.sin((pitch + 10) * Math.PI / 180) * radius * 0.3}
            r={5}
            fill="#64748b"
            className="transition-all duration-200"
          />
          <circle
            cx={center + Math.sin((yaw - 30) * Math.PI / 180) * radius * 0.3}
            cy={center - Math.sin((pitch + 10) * Math.PI / 180) * radius * 0.3}
            r={5}
            fill="#64748b"
            className="transition-all duration-200"
          />
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-dark-100">{pitch.toFixed(1)}°</p>
          <p className="text-xs text-dark-400">Pitch</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-dark-100">{yaw.toFixed(1)}°</p>
          <p className="text-xs text-dark-400">Yaw</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-dark-100">{roll.toFixed(1)}°</p>
          <p className="text-xs text-dark-400">Roll</p>
        </div>
      </div>
    </Card>
  )
}

interface EarMarChartProps {
  earHistory: number[]
  marHistory: number[]
  earThreshold?: number
  marThreshold?: number
}

export const EarMarChart = ({ 
  earHistory, 
  marHistory, 
  earThreshold = 0.25, 
  marThreshold = 0.6 
}: EarMarChartProps) => {
  const maxPoints = 100
  const earData = earHistory.slice(-maxPoints)
  const marData = marHistory.slice(-maxPoints)

  const width = 400
  const height = 150
  const padding = 20
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const getY = (value: number, max: number) => {
    return padding + chartHeight - (value / max) * chartHeight
  }

  const earMax = Math.max(...earData, earThreshold * 2, 0.5)
  const marMax = Math.max(...marData, marThreshold * 2, 1.0)

  return (
    <Card>
      <h3 className="text-lg font-semibold text-dark-100 mb-4">EAR / MAR Trends</h3>
      <div className="relative h-48">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="earGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="marGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          <line
            x1={padding}
            y1={getY(earThreshold, earMax)}
            x2={width - padding}
            y2={getY(earThreshold, earMax)}
            stroke="#0ea5e9"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity="0.5"
          />
          <line
            x1={padding}
            y1={getY(marThreshold, marMax)}
            x2={width - padding}
            y2={getY(marThreshold, marMax)}
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity="0.5"
          />

          {earData.length > 1 && (
            <>
              <path
                d={earData.map((v, i) => 
                  `${padding + (i / (earData.length - 1)) * chartWidth},${getY(v, earMax)}`
                ).join(' ')}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={[
                  `M${padding},${height - padding}`,
                  ...earData.map((v, i) => 
                    `L${padding + (i / (earData.length - 1)) * chartWidth},${getY(v, earMax)}`
                  ),
                  `L${width - padding},${height - padding}Z`
                ].join(' ')}
                fill="url(#earGradient)"
              />
            </>
          )}

          {marData.length > 1 && (
            <>
              <path
                d={marData.map((v, i) => 
                  `${padding + (i / (marData.length - 1)) * chartWidth},${getY(v, marMax)}`
                ).join(' ')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={[
                  `M${padding},${height - padding}`,
                  ...marData.map((v, i) => 
                    `L${padding + (i / (marData.length - 1)) * chartWidth},${getY(v, marMax)}`
                  ),
                  `L${width - padding},${height - padding}Z`
                ].join(' ')}
                fill="url(#marGradient)"
              />
            </>
          )}
        </svg>
        
        <div className="absolute top-2 right-2 flex gap-4 text-xs">
          <span className="flex items-center gap-1 text-primary-400">
            <span className="w-3 h-0.5 bg-primary-400" /> EAR
          </span>
          <span className="flex items-center gap-1 text-warning-400">
            <span className="w-3 h-0.5 bg-warning-400" /> MAR
          </span>
        </div>
      </div>
    </Card>
  )
}