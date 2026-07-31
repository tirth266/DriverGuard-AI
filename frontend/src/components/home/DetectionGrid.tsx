import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  HeartPulse,
  BadgeDollarSign,
  TrendingUp,
  ClipboardCheck,
  Activity,
} from 'lucide-react'
import SectionTitle from '../shared/SectionTitle'
import GlassCard from '../shared/Card'

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: 'Reduce Road Accidents',
    description: 'Prevent collisions before they happen with proactive real-time driver monitoring.',
    accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  {
    icon: HeartPulse,
    title: 'Improve Driver Safety',
    description: 'Protect your most valuable asset — your drivers — with intelligent safety alerts.',
    accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    icon: BadgeDollarSign,
    title: 'Lower Insurance Costs',
    description: 'Demonstrate fleet safety improvements to negotiate better insurance premiums.',
    accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  {
    icon: TrendingUp,
    title: 'Increase Fleet Productivity',
    description: 'Fewer incidents means less downtime, lower repair costs, and higher fleet utilization.',
    accent: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  {
    icon: ClipboardCheck,
    title: 'Ensure Compliance',
    description: 'Meet regulatory safety requirements with automated monitoring and documentation.',
    accent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  {
    icon: Activity,
    title: 'Real-Time Monitoring',
    description: 'See the safety status of every vehicle in your fleet at any moment, from anywhere.',
    accent: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' },
  }),
}

const DetectionGrid = memo(function DetectionGrid() {
  return (
    <section
      className="px-4 md:px-16 max-w-[1440px] mx-auto py-[100px] bg-background"
      aria-label="Benefits"
      id="about"
    >
      <SectionTitle
        badge="Why DriverGuard AI"
        title="Why Choose DriverGuard AI"
        subtitle="Tangible business outcomes that protect your drivers, reduce costs, and strengthen your operations."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {BENEFITS.map((benefit, i) => {
          const Icon = benefit.icon
          return (
            <motion.div
              key={benefit.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              <GlassCard className="glass-card-hover p-8 h-full flex flex-col gap-5 rounded-2xl group cursor-default">
                <div className={`w-14 h-14 rounded-2xl ${benefit.accent} border flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon
                    size={26}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="font-headline-md text-[20px] leading-[1.3] font-semibold text-on-surface">
                  {benefit.title}
                </h3>
                <p className="text-on-surface-variant text-body-md leading-[1.6]">
                  {benefit.description}
                </p>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
})

export default DetectionGrid
