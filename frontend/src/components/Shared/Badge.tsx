import { memo, ReactNode } from 'react'
import type { BadgeVariant } from '../../types'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  safe: 'bg-secondary/20 text-secondary',
  danger: 'bg-error/20 text-error',
  warning: 'bg-tertiary/20 text-tertiary',
  info: 'bg-primary/20 text-primary',
}

const Badge = memo(function Badge({ children, variant = 'info', className = '' }: BadgeProps) {
  return (
    <span
      className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
})

export default Badge
