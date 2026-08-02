import React, { forwardRef } from 'react'
import { cn } from '@/utils/helpers'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  showLabel?: boolean
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  striped?: boolean
  animated?: boolean
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value, 
    max = 100, 
    showLabel = false, 
    variant = 'primary', 
    size = 'md', 
    striped = false, 
    animated = false,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    
    const variantStyles = {
      primary: 'bg-primary-600',
      success: 'bg-success-600',
      warning: 'bg-warning-600',
      danger: 'bg-danger-600',
    }
    
    const sizeStyles = {
      sm: 'h-1.5',
      md: 'h-2.5',
      lg: 'h-4',
    }

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div className={cn(
          'relative overflow-hidden rounded-full bg-dark-800 border border-dark-700',
          sizeStyles[size]
        )}>
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300 ease-out',
              variantStyles[variant],
              striped && 'bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[size:1rem_1rem]',
              animated && 'animate-[progress-bar-stripes_1s_linear_infinite]'
            )}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
          />
        </div>
        {showLabel && (
          <div className="flex justify-between text-xs text-dark-400 mt-1">
            <span>{value.toFixed(0)} / {max}</span>
            <span>{percentage.toFixed(0)}%</span>
          </div>
        )}
      </div>
    )
  }
)

Progress.displayName = 'Progress'

interface CircularProgressProps extends React.SVGAttributes<SVGSVGElement> {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  showValue?: boolean
  children?: React.ReactNode
}

export const CircularProgress = forwardRef<SVGSVGElement, CircularProgressProps>(
  ({ 
    className, 
    value, 
    max = 100, 
    size = 120, 
    strokeWidth = 8, 
    variant = 'primary', 
    showValue = true,
    children,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference
    
    const variantStyles = {
      primary: 'text-primary-500',
      success: 'text-success-500',
      warning: 'text-warning-500',
      danger: 'text-danger-500',
    }

    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        className={cn('transform -rotate-90', className)}
        viewBox={`0 0 ${size} ${size}`}
        {...props}
      >
        <circle
          className="text-dark-700"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          className={cn(
            'transition-all duration-500 ease-out',
            variantStyles[variant]
          )}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
        />
        {(showValue || children) && (
          <foreignObject x="0" y="0" width={size} height={size}>
            <div className="flex items-center justify-center h-full w-full">
              {children || (
                <span className={cn('font-bold', variantStyles[variant])}>
                  {percentage.toFixed(0)}%
                </span>
              )}
            </div>
          </foreignObject>
        )}
      </svg>
    )
  }
)

CircularProgress.displayName = 'CircularProgress'

interface StatCardProps {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

export const StatCard = ({ 
  label, 
  value, 
  change, 
  changeLabel, 
  icon, 
  trend = 'neutral',
  variant = 'default'
}: StatCardProps) => {
  const variantStyles = {
    default: 'bg-dark-900/80 border-dark-700',
    primary: 'bg-primary-500/10 border-primary-500/30',
    success: 'bg-success-500/10 border-success-500/30',
    warning: 'bg-warning-500/10 border-warning-500/30',
    danger: 'bg-danger-500/10 border-danger-500/30',
  }

  const trendColors = {
    up: 'text-success-400',
    down: 'text-danger-400',
    neutral: 'text-dark-400',
  }

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  }

  return (
    <div className={cn('card p-6', variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-dark-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-dark-100">{value}</p>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={cn('text-sm font-medium', trendColors[trend])}>
                {trendIcons[trend]} {Math.abs(change).toFixed(1)}%
              </span>
              {changeLabel && (
                <span className="text-sm text-dark-500">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-xl bg-dark-800/50 text-dark-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

interface GaugeProps {
  value: number
  min?: number
  max?: number
  label: string
  unit?: string
  thresholds?: { value: number; color: string }[]
  size?: number
}

export const Gauge = ({ 
  value, 
  min = 0, 
  max = 100, 
  label, 
  unit = '', 
  thresholds = [
    { value: 30, color: '#ef4444' },
    { value: 60, color: '#f59e0b' },
    { value: 80, color: '#22c55e' },
  ],
  size = 200
}: GaugeProps) => {
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1)
  const angle = percentage * 270 - 135
  
  const getColor = (val: number) => {
    for (const t of thresholds) {
      if (val <= t.value) return t.color
    }
    return thresholds[thresholds.length - 1].color
  }

  const color = getColor(value)
  const radius = (size - 40) / 2
  const centerX = size / 2
  const centerY = size / 2 + 20

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size - 20} viewBox={`0 0 ${size} ${size - 20}`}>
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
          stroke="#1e293b"
          strokeWidth={20}
          fill="none"
        />
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
          stroke={color}
          strokeWidth={20}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(percentage * 270 / 360) * 2 * Math.PI * radius} ${2 * Math.PI * radius}`}
          transform={`rotate(-135 ${centerX} ${centerY})`}
          className="transition-all duration-500 ease-out"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={8}
          fill={color}
        />
      </svg>
      <div className="mt-4 text-center">
        <p className="text-4xl font-bold text-dark-100">{value.toFixed(0)}<span className="text-xl font-normal text-dark-400">{unit}</span></p>
        <p className="text-sm text-dark-400 mt-1">{label}</p>
      </div>
    </div>
  )
}