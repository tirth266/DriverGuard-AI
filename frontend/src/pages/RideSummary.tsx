import { memo, useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  Shield,
  Smartphone,
  Coffee,
  Utensils,
  ArrowLeftRight,
  ArrowDown,
  Eye,
  Smile,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  User,
  PhoneCall,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../layouts/DashboardLayout'
import Button from '../components/shared/Button'
import { rideApi } from '../services/fleetApi'
import { isSessionSummary } from '../services/sessionSummary'
import type { ScoreBreakdown, SessionEvent, SessionSummary } from '../services/sessionSummary'

const EVENT_LABELS: Record<string, string> = {
  phone_use: 'Phone use',
  phone_call_suspected: 'Phone call (suspected)',
  drinking_eating: 'Drinking / eating',
  eyes_closed: 'Eyes closed',
  drowsy: 'Drowsy',
  head_away: 'Head away',
  head_down: 'Head down',
  yawn: 'Yawning',
}

// Landmark inferences carry no detection behind them and are labelled as such.
const INFERRED_EVENTS = new Set(['phone_call_suspected'])

const EVENT_ICONS: Record<string, typeof Smartphone> = {
  phone_use: Smartphone,
  phone_call_suspected: PhoneCall,
  drinking_eating: Utensils,
  eyes_closed: Eye,
  drowsy: Eye,
  head_away: ArrowLeftRight,
  head_down: ArrowDown,
  yawn: Smile,
}

const EVENT_COLORS: Record<string, string> = {
  phone_use: '#FF4D67',
  phone_call_suspected: '#F5B942',
  drinking_eating: '#FB923C',
  eyes_closed: '#FF4D67',
  drowsy: '#FF4D67',
  head_away: '#F5B942',
  head_down: '#F5B942',
  yawn: '#38BDF8',
}

const GRADE_COLORS: Record<string, { stroke: string; text: string; chip: string }> = {
  Excellent: { stroke: '#20D98B', text: 'text-safe', chip: 'bg-safe/10 text-safe border-safe/30' },
  Good: { stroke: '#A3E635', text: 'text-lime-400', chip: 'bg-lime-400/10 text-lime-400 border-lime-400/30' },
  Fair: { stroke: '#F5B942', text: 'text-warning', chip: 'bg-warning/10 text-warning border-warning/30' },
  Poor: { stroke: '#FB923C', text: 'text-orange-400', chip: 'bg-orange-400/10 text-orange-400 border-orange-400/30' },
  Critical: { stroke: '#FF4D67', text: 'text-danger', chip: 'bg-danger/10 text-danger border-danger/30' },
}

/* ─── Circular score gauge ──────────────────────────────────── */

function CircularScoreGauge({ score, grade }: { score: number; grade: string }) {
  const radius = 54
  const circ = 2 * Math.PI * radius
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ
  const color = GRADE_COLORS[grade]?.stroke || '#94A3B8'

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg width={144} height={144} className="rotate-[-90deg]" aria-hidden="true">
        <circle cx={72} cy={72} r={radius} fill="none" stroke="currentColor" className="text-border" strokeWidth={10} />
        <motion.circle
          cx={72}
          cy={72}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold text-on-surface font-mono tracking-tight">{score}</span>
        <span className="text-[11px] font-bold text-on-surface-variant font-mono">/ 100</span>
      </div>
    </div>
  )
}

/* ─── Score over time (inline SVG polyline, no chart dependency) ── */

function ScoreChart({
  timeline,
  score,
  durationSeconds,
  grade,
}: {
  timeline: Array<{ offset_seconds: number; score: number }>
  score: number
  durationSeconds: number
  grade: string
}) {
  const width = 640
  const height = 160
  const padding = 16

  if (timeline.length === 0) {
    return (
      <p className="text-xs text-on-surface-variant py-6 text-center">
        No score samples were recorded. The timeline is sampled every 5 seconds, so it needs a
        longer monitored session.
      </p>
    )
  }

  const lastOffset = timeline[timeline.length - 1].offset_seconds
  const span = Math.max(1, durationSeconds, lastOffset)

  const points = [...timeline, { offset_seconds: span, score }].map(sample => {
    const x = padding + (sample.offset_seconds / span) * (width - padding * 2)
    const y = height - padding - (Math.max(0, Math.min(100, sample.score)) / 100) * (height - padding * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" role="img" aria-label="Safety score over time">
        {[0, 25, 50, 75, 100].map(mark => {
          const y = height - padding - (mark / 100) * (height - padding * 2)
          return (
            <g key={mark}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="currentColor" className="text-border" strokeWidth={1} />
              <text x={4} y={y + 3} fontSize={9} fill="currentColor" className="text-border">{mark}</text>
            </g>
          )
        })}
        <polyline
          points={points.join(' ')}
          fill="none"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          stroke={GRADE_COLORS[grade]?.stroke || '#3B82F6'}
        />
      </svg>
      <div className="flex justify-between text-[10px] font-mono text-on-surface-variant mt-1">
        <span>0:00</span>
        <span>{formatDuration(span)}</span>
      </div>
    </div>
  )
}

/* ─── Helpers ──────────────────────────────────────────────── */

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return [h > 0 && `${h}h`, m > 0 && `${m}m`, s > 0 && `${s}s`].filter(Boolean).join(' ') || '0s'
}

function formatClock(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function secondsForType(breakdown: ScoreBreakdown[], type: string) {
  return breakdown.find(item => item.type === type)?.total_seconds ?? 0
}

function countForType(breakdown: ScoreBreakdown[], type: string) {
  return breakdown.find(item => item.type === type)?.count ?? 0
}

function buildInsights(summary: SessionSummary): string[] {
  if (summary.total_events === 0) {
    return ['No confirmed distraction events were recorded, so no points were deducted.']
  }

  const insights: string[] = []
  const worst = summary.score_breakdown[0]
  if (worst) {
    insights.push(
      `Most points lost to: ${(EVENT_LABELS[worst.type] || worst.type).toLowerCase()} ` +
      `(${worst.points_lost} points across ${worst.count} event${worst.count === 1 ? '' : 's'}).`
    )
  }

  const phoneSeconds = secondsForType(summary.score_breakdown, 'phone_use')
  if (phoneSeconds > 0) {
    insights.push(`Phone use accounted for ${formatDuration(phoneSeconds)} of distracted time.`)
  }

  const eyeSeconds = secondsForType(summary.score_breakdown, 'eyes_closed') + secondsForType(summary.score_breakdown, 'drowsy')
  if (eyeSeconds > 0) {
    insights.push(`Eyes were closed or the driver was drowsy for ${formatDuration(eyeSeconds)}.`)
  }

  const yawns = countForType(summary.score_breakdown, 'yawn')
  if (yawns > 0) {
    insights.push(`${yawns} yawn${yawns === 1 ? '' : 's'} detected.`)
  }

  insights.push(`Lowest score recorded during the ride: ${summary.lowest_session_score}/100.`)
  return insights
}

/* ─── Page ─────────────────────────────────────────────────── */

const RideSummaryPage = memo(function RideSummaryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // The report belongs to a ride, so the ride it belongs to is named in the URL.
  // End Ride appends it there, and it is what survives a reload or a pasted link —
  // router state does not, so it can never be the only handle on the report.
  const rideParam = searchParams.get('ride')
  const rideId = rideParam === null ? null : Number(rideParam)
  const hasRide = rideId !== null && Number.isInteger(rideId) && rideId > 0

  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    // The summary End Ride handed over in router state. Router state is dropped by
    // a reload and by a pasted link, so it is only ever a fallback, never the
    // source of the report. `location` is replaced only on a navigation, so it is
    // the precise dependency for reading the handover out of it.
    const handover = (location.state as { sessionSummary?: unknown } | null)?.sessionSummary
    const handedOver = isSessionSummary(handover) ? handover : null

    if (!hasRide) {
      // No ride to read. A deep link, a bookmark and a reload all land here, and
      // they have no report. Reading the live session instead is what produced a
      // false clean 100/100: that session is reset by every End Ride and every
      // new ride, so it is either empty or belongs to a different ride. No
      // measured ride means no score is shown.
      setSummary(handedOver)
      setLoadFailed(handedOver === null)
      return
    }

    let cancelled = false
    setSummary(null)
    setLoadFailed(false)

    void rideApi.get(rideId)
      .then(({ ride }) => {
        if (cancelled) return
        // The stored report is the authority: it is what the ride was finalized
        // with, so it is the same on the first render and on every reload after.
        const finalized = isSessionSummary(ride?.session_summary) ? ride.session_summary : null
        setSummary(finalized ?? handedOver)
        // A completed ride the server holds no report for is not reportable, and
        // it is never a clean ride: nothing was ever measured against it.
        if (!finalized && !handedOver) setLoadFailed(true)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })

    return () => { cancelled = true }
  }, [rideId, hasRide, location])

  const isBiz = user?.role === 'business' || user?.accountType === 'business'
  const monitoringTarget = isBiz ? '/business/monitoring' : '/personal/monitoring'

  if (loadFailed) {
    return (
      <DashboardLayout>
        <div className="w-full h-full max-h-full overflow-y-auto p-4 md:p-8 text-on-surface">
          <div className="max-w-2xl mx-auto mt-16 p-6 rounded-3xl bg-card border border-border shadow-md text-center space-y-3">
            <AlertTriangle size={28} className="mx-auto text-danger" />
            <h1 className="text-base font-extrabold">Ride report unavailable</h1>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {hasRide
                ? 'This ride has no stored report, so no score is shown. That means nothing was ever measured against it, not that it was driven cleanly.'
                : 'No ride was specified, so there is no report to show. End a ride to open its report, or open this page from a finished ride.'}
            </p>
            <Button variant="secondary" size="md" onClick={() => navigate(monitoringTarget)} className="inline-flex items-center gap-2">
              <ArrowLeft size={15} /> Back to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!summary) {
    return (
      <DashboardLayout>
        <div className="w-full h-full max-h-full overflow-y-auto p-4 md:p-8 text-on-surface flex items-center justify-center">
          <p className="text-xs font-mono text-on-surface-variant">LOADING RIDE SUMMARY...</p>
        </div>
      </DashboardLayout>
    )
  }

  const grade = summary.grade
  const isCleanRide = summary.total_events === 0
  const maxPointsLost = Math.max(1, ...summary.score_breakdown.map(item => item.points_lost))
  const stats = [
    { label: 'Total events', value: String(summary.total_events), icon: AlertTriangle },
    { label: 'Phone time', value: formatDuration(secondsForType(summary.score_breakdown, 'phone_use')), icon: Smartphone },
    { label: 'Eyes closed', value: formatDuration(secondsForType(summary.score_breakdown, 'eyes_closed') + secondsForType(summary.score_breakdown, 'drowsy')), icon: Eye },
    { label: 'Head away', value: formatDuration(secondsForType(summary.score_breakdown, 'head_away') + secondsForType(summary.score_breakdown, 'head_down')), icon: ArrowLeftRight },
    { label: 'Yawns', value: String(countForType(summary.score_breakdown, 'yawn')), icon: Smile },
    { label: 'Food / drink', value: String(countForType(summary.score_breakdown, 'drinking_eating')), icon: Coffee },
  ]

  return (
    <DashboardLayout>
      <div className="w-full h-full max-h-full overflow-y-auto p-4 md:p-8 text-on-surface transition-colors duration-300">
        <div className="max-w-6xl mx-auto space-y-6 pb-12">

          {/* ━━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <Shield size={24} />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold border border-primary/20 uppercase tracking-wider">
                    Ride Summary
                  </span>
                  <h1 className="text-xl md:text-2xl font-extrabold tracking-tight mt-1">Ride Completed</h1>
                  <p className="text-xs text-on-surface-variant mt-0.5 inline-flex items-center gap-2">
                    <User size={12} /> {user?.name || 'Personal Driver'}
                    <span className="text-border">|</span>
                    <Clock size={12} /> {formatDuration(summary.duration_seconds)} monitored
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${GRADE_COLORS[grade]?.chip || 'bg-border text-on-surface-variant border-border'}`}>
                {grade}
              </span>
            </div>
          </motion.header>

          {/* ━━━ SCORE + STAT CARDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-md flex flex-col items-center justify-center gap-3 text-center"
            >
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">Final Safety Score</h2>
              <CircularScoreGauge score={summary.final_score} grade={grade} />
              <div className="grid grid-cols-2 gap-2 w-full">
                <div className="p-2 rounded-xl bg-surface border border-border text-left">
                  <span className="text-[10px] text-on-surface-variant block">Lowest score</span>
                  <span className="font-mono font-bold text-sm">{summary.lowest_session_score}/100</span>
                </div>
                <div className="p-2 rounded-xl bg-surface border border-border text-left">
                  <span className="text-[10px] text-on-surface-variant block">Points lost</span>
                  <span className="font-mono font-bold text-sm">{summary.points_lost}</span>
                </div>
              </div>
            </motion.div>

            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
              {stats.map(stat => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="bg-card border border-border rounded-2xl p-3.5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant inline-flex items-center gap-1">
                      <Icon size={11} className="text-primary" /> {stat.label}
                    </span>
                    <p className="text-base font-extrabold font-mono mt-1.5">{stat.value}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ━━━ SCORE OVER TIME ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-md space-y-3"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-on-surface inline-flex items-center gap-2">
                <Clock size={15} className="text-primary" /> Score Over Time
              </span>
              <span className="text-[10px] font-mono text-on-surface-variant">
                {summary.score_timeline.length} samples · every 5s
              </span>
            </div>
            <ScoreChart
              timeline={summary.score_timeline}
              score={summary.final_score}
              durationSeconds={summary.duration_seconds}
              grade={grade}
            />
          </motion.section>

          {/* ━━━ BREAKDOWN + INSIGHTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-md space-y-4"
            >
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-on-surface border-b border-border pb-3">
                Points Lost by Event Type
              </h2>
              {isCleanRide ? (
                <div className="flex items-center gap-3 rounded-2xl bg-safe/5 border border-safe/25 px-4 py-5">
                  <CheckCircle2 size={22} className="text-safe flex-shrink-0" />
                  <div>
                    <p className="text-sm font-extrabold text-safe">Clean ride</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">No confirmed events, no points deducted.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.score_breakdown.map(item => {
                    const Icon = EVENT_ICONS[item.type] || AlertTriangle
                    const color = EVENT_COLORS[item.type] || '#FF4D67'
                    return (
                        <div key={item.type} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="inline-flex items-center gap-1.5 text-on-surface font-semibold">
                            <Icon size={12} style={{ color }} />
                            {EVENT_LABELS[item.type] || item.type}
                            {INFERRED_EVENTS.has(item.type) && (
                              <span className="text-[9px] font-mono font-bold uppercase px-1 rounded border border-warning/40 text-warning">
                                suspected
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-on-surface-variant">
                            {item.count}× · {formatDuration(item.total_seconds)} · −{item.points_lost} pts
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-surface overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(item.points_lost / maxPointsLost) * 100}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-md space-y-4"
            >
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-on-surface border-b border-border pb-3">
                Insights
              </h2>
              <ul className="space-y-2">
                {buildInsights(summary).map((insight, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-xs text-on-surface">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </motion.section>
          </div>

          {/* ━━━ EVENT TIMELINE TABLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-md space-y-3"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-on-surface">Event Timeline</span>
              <span className="text-[10px] font-mono text-on-surface-variant">{summary.total_events} events</span>
            </div>
            {isCleanRide ? (
              <p className="text-xs text-on-surface-variant">No confirmed distraction events were recorded during this ride.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                      <th className="py-2 font-bold">Event</th>
                      <th className="py-2 font-bold">Started</th>
                      <th className="py-2 font-bold">Duration</th>
                      <th className="py-2 font-bold text-right">Max confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...summary.events].sort((a: SessionEvent, b: SessionEvent) => a.start_time - b.start_time).map((event, index) => {
                      const Icon = EVENT_ICONS[event.type] || AlertTriangle
                      const color = EVENT_COLORS[event.type] || '#FF4D67'
                      return (
                        <tr key={`${event.type}-${event.start_time}-${index}`} className="border-t border-border/60">
                          <td className="py-2">
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border"
                              style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
                            >
                              <Icon size={11} />
                              {EVENT_LABELS[event.type] || event.type}
                            </span>
                          </td>
                          <td className="py-2 font-mono text-on-surface-variant">{formatClock(event.start_time)}</td>
                          <td className="py-2 font-mono">{event.duration.toFixed(1)}s</td>
                          <td className="py-2 font-mono text-right text-on-surface-variant">
                            {event.max_confidence === null ? 'landmark based' : `${Math.round(event.max_confidence * 100)}%`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.section>

          {/* ━━━ ACTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border">
            <Button variant="secondary" size="md" onClick={() => navigate(monitoringTarget)} className="inline-flex items-center gap-2">
              <ArrowLeft size={15} /> Back to Dashboard
            </Button>
            <Button variant="primary" size="md" onClick={() => navigate(monitoringTarget)} className="inline-flex items-center gap-2">
              <RotateCcw size={15} /> Start New Ride
            </Button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
})

export default RideSummaryPage
