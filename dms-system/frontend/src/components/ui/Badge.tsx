import React, { forwardRef } from 'react'
import { cn } from '@/utils/helpers'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  dotColor?: string
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot = false, dotColor, children, ...props }, ref) => {
    const variantStyles = {
      primary: 'bg-primary-500/20 text-primary-400 border border-primary-500/30',
      success: 'bg-success-500/20 text-success-400 border border-success-500/30',
      warning: 'bg-warning-500/20 text-warning-400 border border-warning-500/30',
      danger: 'bg-danger-500/20 text-danger-400 border border-danger-500/30',
      info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      default: 'bg-dark-700 text-dark-300 border border-dark-600',
    }
    
    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs gap-1',
      md: 'px-2.5 py-0.5 text-xs gap-1.5',
      lg: 'px-3 py-1 text-sm gap-2',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium rounded-full border',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor || 'currentColor' }} />}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: 'online' | 'offline' | 'warning' | 'error' | 'connecting' | 'recording'
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, size = 'md', showText = true, children, ...props }, ref) => {
    const statusConfig = {
      online: { variant: 'success' as const, dotColor: '#22c55e', text: 'Online' },
      offline: { variant: 'default' as const, dotColor: '#64748b', text: 'Offline' },
      warning: { variant: 'warning' as const, dotColor: '#f59e0b', text: 'Warning' },
      error: { variant: 'danger' as const, dotColor: '#ef4444', text: 'Error' },
      connecting: { variant: 'info' as const, dotColor: '#3b82f6', text: 'Connecting' },
      recording: { variant: 'danger' as const, dotColor: '#ef4444', text: 'Recording' },
    }

    const config = statusConfig[status]

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        size={size}
        dot
        dotColor={config.dotColor}
        className={className}
        {...props}
      >
        {showText ? config.text : children}
      </Badge>
    )
  }
)

StatusBadge.displayName = 'StatusBadge'