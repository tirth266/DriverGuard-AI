import React, { memo } from 'react'

export interface CardProps {
  children: React.ReactNode
  className?: string
  hoverEffect?: boolean
}

export const GlassCard = memo(function GlassCard({
  children,
  className = '',
  hoverEffect = true,
}: CardProps) {
  return (
    <div
      className={`glass-card p-6 md:p-8 border border-border rounded-2xl transition-all duration-300 ${
        hoverEffect ? 'hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
})

export const Card = GlassCard
export default GlassCard
