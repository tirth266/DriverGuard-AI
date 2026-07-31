import { memo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Truck,
  Gauge,
} from 'lucide-react'
import SectionTitle from '../Shared/SectionTitle'

const METRICS = [
  {
    id: 'online-drivers',
    label: 'Online Drivers',
    value: 247,
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'todays-trips',
    label: "Today's Trips",
    value: 1842,
    icon: MapPin,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: 'safety-score',
    label: 'Safety Score',
    value: 96.4,
    suffix: '%',
    icon: ShieldCheck,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'recent-alerts',
    label: 'Recent Alerts',
    value: 12,
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'vehicles-active',
    label: 'Vehicles Active',
    value: 189,
    icon: Truck,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'risk-level',
    label: 'Risk Level',
    displayValue: 'Low',
    icon: Gauge,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
]

function AnimatedCounter({ value, suffix, duration = 1.5 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const startTime = Date.now()
          const isDecimal = value % 1 !== 0

          const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / (duration * 1000), 1)
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3)
            const current = eased * value

            setCount(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current))

            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, duration])

  return (
    <span ref={ref} className="font-metric text-[36px] md:text-[42px] leading-none tracking-[-0.01em] font-bold text-on-surface">
      {typeof value === 'number' ? count.toLocaleString() : value}
      {suffix && <span className="text-[20px] text-on-surface-variant font-medium ml-0.5">{suffix}</span>}
    </span>
  )
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: 'easeOut' },
  }),
}

const KPICards = memo(function KPICards() {
  return (
    <section
      className="bg-surface border-y border-border py-[100px] transition-colors duration-300"
      aria-label="Dashboard preview"
    >
      <div className="px-4 md:px-16 max-w-[1440px] mx-auto">
        <SectionTitle
          badge="Dashboard Preview"
          title="Live Dashboard Preview"
          subtitle="See how fleet managers monitor safety in real time across all vehicles."
        />

        <div className="glass-card rounded-3xl p-6 md:p-10 border border-border">
          {/* Dashboard header */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-dot" />
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-[0.08em] uppercase">
                Fleet Monitoring — Live
              </span>
            </div>
            <span className="text-[11px] text-on-surface-variant tracking-widest uppercase font-medium">
              Updated just now
            </span>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {METRICS.map((m, i) => {
              const Icon = m.icon
              return (
                <motion.div
                  key={m.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-30px' }}
                  className="glass-card-hover rounded-2xl p-5 flex flex-col gap-3 border border-border cursor-default"
                >
                  <div className={`w-10 h-10 rounded-xl ${m.bgColor} border flex items-center justify-center`}>
                    <Icon size={18} className={m.color} aria-hidden="true" />
                  </div>
                  <p className="text-[10px] font-bold text-on-surface-variant tracking-[0.06em] uppercase">
                    {m.label}
                  </p>
                  {'displayValue' in m && m.displayValue ? (
                    <span className="font-metric text-[36px] md:text-[42px] leading-none tracking-[-0.01em] font-bold text-emerald-600 dark:text-emerald-400">
                      {m.displayValue}
                    </span>
                  ) : (
                    <AnimatedCounter value={m.value as number} suffix={(m as any).suffix} />
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
})

export default KPICards
