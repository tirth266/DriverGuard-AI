import { memo } from 'react'
import { motion } from 'framer-motion'
import GlassCard from '../Shared/GlassCard'

const METRICS = [
  {
    id: 'accuracy',
    label: 'VALIDATION ACCURACY',
    value: '96.8',
    unit: '%',
    accentClass: 'border-l-primary',
    unitClass: 'text-primary',
    barClass: 'bg-primary',
    progress: 96.8,
  },
  {
    id: 'fps',
    label: 'REAL-TIME PERFORMANCE',
    value: '62',
    unit: 'FPS',
    accentClass: 'border-l-secondary',
    unitClass: 'text-secondary',
    barClass: 'bg-secondary',
    progress: 80,
  },
  {
    id: 'latency',
    label: 'INFERENCE LATENCY',
    value: '12.4',
    unit: 'MS',
    accentClass: 'border-l-tertiary',
    unitClass: 'text-tertiary',
    barClass: 'bg-tertiary',
    progress: 95,
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.12, ease: 'easeOut' },
  }),
}

const KPICards = memo(function KPICards() {
  return (
    <section
      className="px-4 md:px-16 max-w-[1440px] mx-auto py-[120px]"
      aria-label="Performance KPIs"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {METRICS.map((m, i) => (
          <motion.div
            key={m.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          >
            <GlassCard
              className={`p-10 rounded-2xl border-l-4 ${m.accentClass} h-full`}
              aria-label={`${m.label}: ${m.value}${m.unit}`}
            >
              <p className="font-label-caps text-label-caps text-on-surface-variant mb-2 tracking-[0.05em] uppercase">
                {m.label}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-metric text-[64px] text-on-surface leading-none tracking-[-0.01em] font-bold">
                  {m.value}
                </span>
                <span className={`font-metric text-[24px] font-medium ${m.unitClass}`}>
                  {m.unit}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1 bg-white/5 mt-4 rounded-full overflow-hidden" role="progressbar" aria-valuenow={m.progress} aria-valuemin={0} aria-valuemax={100}>
                <motion.div
                  className={`h-full ${m.barClass} rounded-full`}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${m.progress}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: i * 0.12 + 0.3, ease: 'easeOut' }}
                />
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  )
})

export default KPICards
