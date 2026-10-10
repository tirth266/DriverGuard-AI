import { memo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Truck,
  AlertTriangle,
  Activity,
} from 'lucide-react'
import SectionTitle from '../shared/SectionTitle'

function AnimatedNumber({ value, suffix = '', duration = 1.4 }: { value: number; suffix?: string; duration?: number }) {
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
      { threshold: 0.2 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, duration])

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

/**
 * This section is a static illustration of the report layout.
 *
 * Every figure in it is a fixed sample value. The public site has no session and
 * no fleet, and no endpoint aggregates fleet-wide metrics, so nothing here is
 * live. The banner says so above the figures, and the animated counters are kept
 * only because the layout is the point being illustrated — the numbers carry no
 * meaning. Real per-ride figures appear on a ride report after a monitored
 * session.
 */
export default memo(function KPISection() {
  return (
    <section
      id="metrics"
      className="py-20 md:py-28 px-6 max-w-[1280px] mx-auto"
      aria-label="Example fleet safety report layout"
    >
      <SectionTitle
        badge="Report Layout Example"
        title="Fleet Safety Report"
        subtitle="An illustration of the metrics a ride report presents. The values are samples, not live data."
        centered
        className="mb-10"
      />

      <div className="mb-10 flex items-start gap-2.5 rounded-[14px] border border-warning/30 bg-warning/5 px-4 py-3">
        <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary leading-relaxed">
          <strong className="text-text-primary">Sample data.</strong> This page is public and has no
          account, so nothing below is measured. Actual figures come from a monitored ride's own
          report.
        </p>
      </div>

      {/* ─── Asymmetrical Visual Composition ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        {/* ━━━ DOMINANT HERO PANEL: Safety Score (5 Cols) ━━━ */}
        <div className="lg:col-span-5 rounded-[20px] border border-white/10 bg-surface p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-lg">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Primary Fleet Index
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-warning/10 border border-warning/25 text-warning text-[11px] font-mono font-bold">
                <span>EXAMPLE</span>
              </div>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="font-display text-[60px] sm:text-[72px] font-extrabold tracking-[-0.04em] leading-none text-text-primary">
                  <AnimatedNumber value={96.4} suffix="%" />
                </h3>
              </div>

              <p className="font-display text-lg font-bold text-text-primary mt-3">
                Fleet Safety Score
              </p>
              
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-text-muted">
                  Sample value. A real score comes from one ride's own report.
                </span>
              </div>
            </div>

            <p className="text-sm text-text-secondary leading-[1.6]">
              Sample figures illustrating a fleet-level roll-up. Seatbelt utilization is not
              among them: the pipeline does not detect seatbelts.
            </p>
          </div>

          {/* Calibrated Safety Bar */}
          <div className="pt-6 border-t border-border/80 mt-6 space-y-2">
            <div className="flex justify-between text-xs font-mono text-text-muted">
              <span>SAMPLE TARGET (95.0%)</span>
              <span className="text-text-muted font-bold">ILLUSTRATED</span>
            </div>
            <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: '96.4%' }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="h-full bg-safe rounded-full"
              />
            </div>
          </div>
        </div>

        {/* ━━━ SECONDARY ASYMMETRICAL METRICS (7 Cols) ━━━ */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">

          {/* Row 1: Two Prominent Panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Active Vehicles */}
            <div className="rounded-[18px] border border-white/10 bg-surface p-6 flex flex-col justify-between space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                  Active Vehicles
                </span>
                <div className="w-7 h-7 rounded-[6px] bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                  <Truck size={15} />
                </div>
              </div>

              <div>
                <span className="font-display text-[38px] font-extrabold tracking-tight leading-none text-text-primary">
                  <AnimatedNumber value={189} />
                </span>
                <p className="text-xs text-text-secondary mt-1">
                  Commercial trucks currently in transit
                </p>
              </div>

              <div className="text-[11px] font-mono text-text-muted flex items-center gap-1 pt-2 border-t border-border/60">
                <Activity size={12} />
                <span>Sample figure</span>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="rounded-[18px] border border-white/10 bg-surface p-6 flex flex-col justify-between space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                  Recent Alerts
                </span>
                <div className="w-7 h-7 rounded-[6px] bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
                  <AlertTriangle size={15} />
                </div>
              </div>

              <div>
                <span className="font-display text-[38px] font-extrabold tracking-tight leading-none text-warning">
                  <AnimatedNumber value={12} />
                </span>
                <p className="text-xs text-text-secondary mt-1">
                  Flagged events in current 12h cycle
                </p>
              </div>

              <div className="text-[11px] font-mono text-text-muted flex items-center justify-between pt-2 border-t border-border/60">
                <span>11 RESOLVED</span>
                <span className="text-warning font-semibold">1 PENDING REVIEW</span>
              </div>
            </div>

          </div>

          {/* Row 2: Clean High-Density Operational Data Strip */}
          <div className="rounded-[18px] border border-white/10 bg-surface/80 p-5 grid grid-cols-1 sm:grid-cols-3 gap-5 divide-y sm:divide-y-0 sm:divide-x divide-border/80">
            
            <div className="pt-2 sm:pt-0 sm:pr-4">
              <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider block">
                Online Drivers
              </span>
              <span className="font-display text-2xl font-bold tracking-tight text-text-primary mt-1 block">
                <AnimatedNumber value={247} />
              </span>
              <span className="text-[11px] text-text-secondary mt-0.5 block">
                Assigned to shifts
              </span>
            </div>

            <div className="pt-3 sm:pt-0 sm:px-4">
              <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider block">
                Today's Trips
              </span>
              <span className="font-display text-2xl font-bold tracking-tight text-text-primary mt-1 block">
                <AnimatedNumber value={1842} />
              </span>
              <span className="text-[11px] text-text-secondary mt-0.5 block">
                Completed & logged
              </span>
            </div>

            <div className="pt-3 sm:pt-0 sm:pl-4">
              <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider block">
                Fleet Risk Level
              </span>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2.5 py-0.5 rounded-[4px] bg-safe/10 border border-safe/30 text-safe font-mono text-xs font-bold uppercase tracking-wider">
                  LOW RISK
                </span>
              </div>
              <span className="text-[11px] text-text-secondary mt-1 block">
                Within insurance benchmarks
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* ─── LIVE STREAM ACTIVITY LIST (Open Layout, Not Container Overload) ─── */}
      <div className="mt-10 pt-8 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-text-muted" />
            <span className="text-xs font-mono uppercase tracking-wider text-text-secondary font-semibold">
              Sample Event Stream
            </span>
          </div>
          <span className="text-xs font-mono text-text-muted">Illustration only</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="p-4 rounded-[12px] bg-surface/50 border border-border/70 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-text-primary">KENWORTH T680 #2014</span>
              <span className="text-text-muted">12m ago</span>
            </div>
            <p className="text-xs text-text-secondary">
              Marcus Vance took rest break following drowsiness prompt.
            </p>
            <span className="text-[10px] font-mono text-safe font-semibold">REST RESOLVED</span>
          </div>

          <div className="p-4 rounded-[12px] bg-surface/50 border border-border/70 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-text-primary">CASCADIA #4082</span>
              <span className="text-text-muted">4m ago</span>
            </div>
            <p className="text-xs text-text-secondary">
              Driver eyes open, head forward. No confirmed events.
            </p>
            <span className="text-[10px] font-mono text-safe font-semibold">NO EVENTS</span>
          </div>

          <div className="p-4 rounded-[12px] bg-surface/50 border border-border/70 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-text-primary">VOLVO VNL 860 #1093</span>
              <span className="text-text-muted">Just now</span>
            </div>
            <p className="text-xs text-text-secondary">
              Elena Rostova completed shift handover. Telemetry archived.
            </p>
            <span className="text-[10px] font-mono text-brand font-semibold">SHIFT CONCLUDED</span>
          </div>

        </div>
      </div>
    </section>
  )
})
