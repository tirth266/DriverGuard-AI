import { memo } from 'react'
import { motion } from 'framer-motion'
import { Camera, AlertTriangle, Volume2, Bell, CheckCircle } from 'lucide-react'
import SectionTitle from '../shared/SectionTitle'

const STEPS = [
  {
    id: 1,
    title: 'AI Camera Monitors Driver',
    description: 'An intelligent camera system continuously observes driver behavior inside the cabin.',
    icon: Camera,
  },
  {
    id: 2,
    title: 'Unsafe Behaviour Detected',
    description: 'The system instantly identifies fatigue, phone usage, smoking, or distracted driving.',
    icon: AlertTriangle,
  },
  {
    id: 3,
    title: 'Instant Voice Alert',
    description: 'The driver receives an immediate voice warning to correct unsafe behavior.',
    icon: Volume2,
  },
  {
    id: 4,
    title: 'Fleet Manager Notified',
    description: 'Your fleet manager receives a real-time notification with event details and severity.',
    icon: Bell,
  },
  {
    id: 5,
    title: 'Trip Continues Safely',
    description: 'The driver stays focused, and the trip continues without incidents.',
    icon: CheckCircle,
  },
]

const Pipeline = memo(function Pipeline() {
  return (
    <section
      className="bg-surface border-y border-border py-[100px] transition-colors duration-300"
      aria-label="How it works"
      id="how-it-works"
    >
      <div className="px-4 md:px-16 max-w-[1440px] mx-auto">
        <SectionTitle
          badge="How It Works"
          title="How DriverGuard AI Works"
          subtitle="From detection to prevention — a seamless safety loop that protects every journey."
        />

        {/* Timeline */}
        <div className="relative max-w-3xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/40 to-transparent" aria-hidden="true" />

          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const isLast = i === STEPS.length - 1
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
                  className={`relative flex gap-6 md:gap-8 ${isLast ? 'pb-0' : 'pb-10'}`}
                >
                  {/* Step circle */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-md">
                      <Icon size={22} className="text-primary" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Content card */}
                  <div className="glass-card-hover rounded-2xl p-6 flex-1 border border-border cursor-default">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[11px] font-bold text-primary tracking-[0.08em] uppercase">
                        Step {step.id}
                      </span>
                    </div>
                    <h3 className="font-headline-md text-[20px] leading-[1.3] font-semibold text-on-surface mb-2">
                      {step.title}
                    </h3>
                    <p className="text-on-surface-variant text-body-md leading-[1.6]">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
})

export default Pipeline
