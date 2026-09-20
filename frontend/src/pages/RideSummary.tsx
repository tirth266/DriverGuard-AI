import { memo, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  MapPin,
  Shield,
  Sparkles,
  Download,
  RotateCcw,
  Zap,
  User,
  Truck,
  TrendingUp,
  Home,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../layouts/DashboardLayout'
import Button from '../components/shared/Button'
import { useToast } from '../context/ToastContext'

/* ─── Circular Score Gauge ────────────────────────────────── */
function CircularScoreGauge({ score }: { score: number }) {
  const radius = 54
  const circ = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ
  const color = score >= 90 ? '#10b981' : score >= 80 ? '#f59e0b' : '#f43f5e'

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg width={144} height={144} className="rotate-[-90deg]">
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

type SessionEvent = {
  type: string
  start_time: number
  end_time: number
  duration: number
  max_confidence: number
  min_score: number
}

type SessionSummary = {
  current_safety_score: number
  lowest_session_score: number
  total_distraction_events: number
  phone_events: number
  bottle_events: number
  cup_events: number
  total_distracted_duration: number
  events: SessionEvent[]
}

const EMPTY_SESSION_SUMMARY: SessionSummary = {
  current_safety_score: 0,
  lowest_session_score: 0,
  total_distraction_events: 0,
  phone_events: 0,
  bottle_events: 0,
  cup_events: 0,
  total_distracted_duration: 0,
  events: [],
}

const FINAL_SESSION_STORAGE_KEY = 'driverguard.final_session_summary'

const RideSummaryPage = memo(function RideSummaryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const navigationSessionSummary = location.state?.rideData?.sessionSummary as SessionSummary | undefined
  const storedSessionSummary = (() => {
    try {
      const stored = sessionStorage.getItem(FINAL_SESSION_STORAGE_KEY)
      return stored ? JSON.parse(stored) as SessionSummary : undefined
    } catch {
      return undefined
    }
  })()
  const initialSessionSummary = navigationSessionSummary || storedSessionSummary
  const [fetchedSessionSummary, setFetchedSessionSummary] = useState<SessionSummary | null>(initialSessionSummary || null)

  useEffect(() => {
    if (initialSessionSummary) return

    const backendUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')
    void fetch(`${backendUrl}/api/video/session/summary`)
      .then(response => response.ok ? response.json() : null)
      .then(summary => {
        if (summary && Array.isArray(summary.events)) {
          setFetchedSessionSummary(summary as SessionSummary)
        }
      })
      .catch(() => undefined)
  }, [initialSessionSummary])

  // The report is driven by the monitoring session payload.
  const rideData = location.state?.rideData || {
    driverName: user?.name || 'John Driver',
    vehicle: user?.role === 'business' ? 'Freightliner Cascadia #4082' : 'Tesla Model 3 #9021',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    startTime: '09:15 AM',
    endTime: '10:28 AM',
    duration: '1h 13m',
    distance: '48.2 km',
    avgSpeed: '52 km/h',
    score: 0,
  }

  const sessionSummary = fetchedSessionSummary || EMPTY_SESSION_SUMMARY
  const currentScore = sessionSummary.current_safety_score
  const sessionEvents = sessionSummary.events
  const formatEventTime = (timestamp: number) => new Date(timestamp * 1000).toLocaleTimeString()
  const eventDescription = (event: SessionEvent) =>
    `${event.type} detected for ${event.duration}s (${Math.round(event.max_confidence * 100)}% max confidence; minimum score ${event.min_score}/100).`

  const isBiz = user?.role === 'business' || user?.accountType === 'business'
  const monitoringTarget = isBiz ? '/business/monitoring' : '/personal/monitoring'

  const handleDownload = () => {
    toast.info('Downloading Summary Report', 'Preparing PDF report for download...')
  }

  return (
    <DashboardLayout>
      <div className="w-full h-full max-h-full overflow-y-auto p-4 md:p-8 text-on-surface transition-colors duration-300">
        <div className="max-w-6xl mx-auto space-y-8 pb-12">

          {/* ━━━ TOP SUCCESS BANNER & METADATA GRID ━━━━━━━━━━━━━ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden space-y-6"
          >
            {/* Ambient Green Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-sm flex-shrink-0">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold border border-emerald-500/20 uppercase tracking-wider">
                      Ride Summary
                    </span>
                    <span className="text-xs text-on-surface-variant font-mono">{rideData.date}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight mt-1">
                    Ride Completed Successfully
                  </h1>
                  <p className="text-xs md:text-sm text-on-surface-variant mt-0.5">
                    Your driving session has been completed successfully. Here is your complete AI driving report.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="secondary" size="md" onClick={() => navigate(monitoringTarget)} className="flex items-center gap-2">
                  <RotateCcw size={16} /> Start New Ride
                </Button>
                <Button variant="primary" size="md" onClick={() => navigate('/')} className="flex items-center gap-2">
                  <Home size={16} /> Return to Home
                </Button>
              </div>
            </div>

            {/* Quick Metadata Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="p-3 rounded-2xl bg-surface border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                  <User size={12} className="text-primary" /> Driver
                </span>
                <p className="text-xs font-extrabold text-on-surface truncate mt-1">{rideData.driverName}</p>
              </div>

              <div className="p-3 rounded-2xl bg-surface border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                  <Truck size={12} className="text-primary" /> Vehicle
                </span>
                <p className="text-xs font-extrabold text-on-surface truncate mt-1">{rideData.vehicle}</p>
              </div>

              <div className="p-3 rounded-2xl bg-surface border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                  <Clock size={12} className="text-primary" /> Duration
                </span>
                <p className="text-xs font-extrabold text-on-surface font-mono mt-1">{rideData.duration}</p>
              </div>

              <div className="p-3 rounded-2xl bg-surface border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                  <MapPin size={12} className="text-primary" /> Distance
                </span>
                <p className="text-xs font-extrabold text-on-surface font-mono mt-1">{rideData.distance}</p>
              </div>

              <div className="p-3 rounded-2xl bg-surface border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                  <TrendingUp size={12} className="text-primary" /> Avg Speed
                </span>
                <p className="text-xs font-extrabold text-on-surface font-mono mt-1">{rideData.avgSpeed}</p>
              </div>

              <div className="p-3 rounded-2xl bg-surface border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                  <Clock size={12} className="text-primary" /> Time Window
                </span>
                <p className="text-xs font-extrabold text-on-surface font-mono mt-1">{rideData.startTime} - {rideData.endTime}</p>
              </div>
            </div>
          </motion.div>

          {/* ━━━ SCORE & AI INSIGHTS GRID ━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* AI Safety Score Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-md flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-primary" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-on-surface">Overall AI Safety Score</h2>
              </div>

              <CircularScoreGauge score={currentScore} />

              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
                  currentScore >= 90
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : currentScore >= 80
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}>
                  Current Session Score: {currentScore}/100
                </span>
              </div>

              <div className="w-full grid grid-cols-2 gap-2 text-left">
                <div className="p-2 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] text-on-surface-variant block">Lowest Session Score</span>
                  <span className="font-mono font-bold text-sm">{sessionSummary.lowest_session_score}/100</span>
                </div>
                <div className="p-2 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] text-on-surface-variant block">Distraction Events</span>
                  <span className="font-mono font-bold text-sm">{sessionSummary.total_distraction_events}</span>
                </div>
                <div className="p-2 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] text-on-surface-variant block">Phone / Bottle / Cup</span>
                  <span className="font-mono font-bold text-sm">{sessionSummary.phone_events} / {sessionSummary.bottle_events} / {sessionSummary.cup_events}</span>
                </div>
                <div className="p-2 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] text-on-surface-variant block">Distracted Duration</span>
                  <span className="font-mono font-bold text-sm">{sessionSummary.total_distracted_duration}s</span>
                </div>
              </div>
            </motion.div>

            {/* Phase 8 Session Analysis Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-md space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Sparkles size={18} className="text-primary" />
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-on-surface">Session Analysis</h2>
                </div>

                <div className="space-y-2">
                  {(sessionEvents.length === 0
                    ? ['No confirmed distraction events detected during this session.']
                    : sessionEvents.map(eventDescription)
                  ).map((insight: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-on-surface">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Session Score Range</span>
                <p className="text-xs text-on-surface-variant">Current score {currentScore}/100; lowest recorded score {sessionSummary.lowest_session_score}/100.</p>
              </div>
            </motion.div>

          </div>

          {/* ━━━ DETECTED EVENTS METRICS CARDS ━━━━━━━━━━━━━━━━ */}
          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-on-surface tracking-tight flex items-center gap-2">
              <Zap size={18} className="text-primary" /> Detected Telemetry Events
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessionEvents.length === 0 ? (
                <div className="sm:col-span-2 lg:col-span-3 p-5 rounded-3xl bg-card border border-border shadow-sm text-xs text-on-surface-variant">
                  No confirmed distraction events detected during this session.
                </div>
              ) : sessionEvents.map((event, index) => (
                <div key={`${event.type}-${event.start_time}-${index}`} className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-on-surface capitalize">{event.type}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-rose-500/10 text-rose-500 border-rose-500/20">
                      CONFIRMED
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">{eventDescription(event)}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {formatEventTime(event.start_time)} - {formatEventTime(event.end_time)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ━━━ SESSION TIMELINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ride Timeline Card */}
            <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm font-extrabold uppercase tracking-wider text-on-surface flex items-center gap-2">
                  <Clock size={18} className="text-primary" /> Session Timeline Log
                </span>
                <span className="text-xs text-on-surface-variant font-mono">{sessionEvents.length} Events</span>
              </div>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {sessionEvents.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">No confirmed distraction events detected during this session.</p>
                ) : sessionEvents.map((event, index) => (
                  <div key={`${event.type}-${event.start_time}-${index}`} className="relative flex items-center justify-between gap-3 text-xs">
                    <span className="absolute -left-6 w-2.5 h-2.5 rounded-full border-2 border-card bg-rose-500" />
                    <span className="font-semibold text-on-surface">{event.type} ({event.duration}s, {Math.round(event.max_confidence * 100)}% max confidence)</span>
                    <span className="font-mono text-[11px] text-on-surface-variant whitespace-nowrap">{formatEventTime(event.start_time)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ━━━ FOOTER ACTION BUTTONS ━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-border">
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="md" onClick={handleDownload} className="flex items-center gap-2">
                <Download size={16} /> Download Report (PDF)
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary" size="md" onClick={() => navigate(monitoringTarget)} className="flex items-center gap-2">
                <RotateCcw size={16} /> Start New Ride
              </Button>
              <Button variant="primary" size="md" onClick={() => navigate('/')} className="flex items-center gap-2">
                <Home size={16} /> Return to Home
              </Button>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
})

export default RideSummaryPage
