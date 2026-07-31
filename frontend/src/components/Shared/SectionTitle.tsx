import { memo } from 'react'
import { motion } from 'framer-motion'

interface SectionTitleProps {
  title: string
  subtitle?: string
  badge?: string
  centered?: boolean
  className?: string
}

const SectionTitle = memo(function SectionTitle({
  title,
  subtitle,
  badge,
  centered = true,
  className = '',
}: SectionTitleProps) {
  return (
    <div className={`mb-16 ${centered ? 'text-center' : ''} ${className}`}>
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className={`${centered ? 'flex justify-center' : ''} mb-4`}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-primary/20 font-label-caps text-label-caps text-primary tracking-[0.05em] uppercase font-bold">
            {badge}
          </span>
        </motion.div>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="font-display text-display text-on-surface leading-none mb-4 font-bold"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`text-on-surface-variant text-body-lg ${centered ? 'max-w-2xl mx-auto' : 'max-w-xl'}`}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  )
})

export default SectionTitle
