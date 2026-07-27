import { memo } from 'react'
import { motion } from 'framer-motion'
import { Video, Cpu, Brain, LayoutDashboard } from 'lucide-react'
import GlassCard from '../Shared/GlassCard'

const STEPS = [
  { id: 1, label: '1. In-Cabin Camera', icon: Video },
  { id: 2, label: '2. Pre-Processing', icon: Cpu },
  { id: 3, label: '3. YOLO Inference', icon: Brain },
  { id: 4, label: '4. Fleet Dashboard', icon: LayoutDashboard },
]

const nodeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.15, ease: 'easeOut', type: 'spring' },
  }),
}

const lineVariants = {
  hidden: { scaleX: 0, originX: 0 },
  visible: (i: number) => ({
    scaleX: 1,
    transition: { duration: 0.6, delay: i * 0.15 + 0.2, ease: 'easeOut' },
  }),
}

const Pipeline = memo(function Pipeline() {
  return (
    <section
      className="px-4 md:px-16 max-w-[1440px] mx-auto py-[120px]"
      aria-label="AI processing pipeline"
    >
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="font-display text-[32px] leading-[1.2] font-semibold text-center mb-16 text-on-surface"
      >
        The Intelligent Pipeline
      </motion.h2>

      <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const isLast = i === STEPS.length - 1
          return (
            <div key={step.id} className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
              {/* Node */}
              <motion.div
                custom={i}
                variants={nodeVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ scale: 1.12, transition: { duration: 0.2 } }}
                className="flex flex-col items-center gap-4 text-center z-10 flex-shrink-0"
              >
                <GlassCard
                  glow
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                >
                  <Icon className="text-primary" size={28} aria-hidden="true" />
                </GlassCard>
                <p className="font-label-caps text-label-caps text-on-surface tracking-[0.05em] uppercase whitespace-nowrap">
                  {step.label}
                </p>
              </motion.div>

              {/* Connector line */}
              {!isLast && (
                <motion.div
                  custom={i}
                  variants={lineVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="hidden md:block flex-1 h-px relative overflow-hidden min-w-[40px]"
                >
                  {/* Static gradient track */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20" />
                  {/* Animated pulse */}
                  <motion.div
                    className="absolute inset-0"
                    animate={{
                      background: [
                        'linear-gradient(90deg, transparent 0%, rgba(173,198,255,0.5) 40%, rgba(93,230,255,0.4) 60%, transparent 100%)',
                        'linear-gradient(90deg, transparent 20%, rgba(173,198,255,0.5) 60%, rgba(93,230,255,0.4) 80%, transparent 100%)',
                        'linear-gradient(90deg, transparent 0%, rgba(173,198,255,0.5) 40%, rgba(93,230,255,0.4) 60%, transparent 100%)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
})

export default Pipeline
