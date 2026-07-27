import { memo, ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  glow?: boolean
  onClick?: () => void
}

const GlassCard = memo(function GlassCard({ children, className = '', glow = false, onClick }: GlassCardProps) {
  return (
    <div
      className={`glass-card rounded-xl ${glow ? 'glow-blue' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
})

export default GlassCard
