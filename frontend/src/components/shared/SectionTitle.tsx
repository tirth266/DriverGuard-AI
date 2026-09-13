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
        <div className="flex items-center gap-2 justify-start mb-2" style={{ justifyContent: centered ? 'center' : 'flex-start' }}>
          <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-on-surface-variant/90 border border-border px-2.5 py-0.5 rounded-[6px] bg-surface/60">
            {badge}
          </span>
        </div>
      )}
      <h2 className="font-display text-[28px] sm:text-[36px] md:text-[40px] leading-[1.12] font-extrabold tracking-[-0.03em] text-on-surface">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm md:text-base text-on-surface-variant font-normal leading-[1.65] max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  )
})

export default SectionTitle
