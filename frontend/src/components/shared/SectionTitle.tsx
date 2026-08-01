import { memo } from 'react'

export interface SectionTitleProps {
  badge?: string
  title: string
  subtitle?: string
  centered?: boolean
  className?: string
}

const SectionTitle = memo(function SectionTitle({
  badge,
  title,
  subtitle,
  centered = true,
  className = '',
}: SectionTitleProps) {
  return (
    <div
      className={`space-y-3 ${centered ? 'text-center max-w-3xl mx-auto' : 'text-left max-w-2xl'} ${className}`}
    >
      {badge && (
        <span className="inline-block px-3 py-1 text-xs font-bold tracking-wider uppercase rounded-full bg-primary/10 text-primary border border-primary/20">
          {badge}
        </span>
      )}
      <h2 className="font-display text-2xl md:text-4xl font-extrabold tracking-tight text-on-surface">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm md:text-base text-on-surface-variant font-normal leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
})

export default SectionTitle
