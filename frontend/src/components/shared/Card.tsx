import React, { memo } from 'react'

export interface CardProps {
  children: React.ReactNode
  className?: string
  hoverEffect?: boolean
}

export const GlassCard = memo(function GlassCard({
  children,
  className = '',
  hoverEffect = false,
}: CardProps) {
  return (
    <div
      className={`bg-card p-6 md:p-7 border border-border rounded-card transition-all duration-200 ${
        hoverEffect ? 'hover:border-white/20 hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
})

export const Card = GlassCard
export default GlassCard
