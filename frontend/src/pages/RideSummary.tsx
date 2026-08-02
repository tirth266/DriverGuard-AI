import { memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  MapPin,
  Shield,
  Smartphone,
  Eye,
  Award,
  Sparkles,
  Download,
  RotateCcw,
  ShieldAlert,
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

const RideSummaryPage = memo(function RideSummaryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  // Use passed location state or default mock session data
  const rideData = location.state?.rideData || {
    driverName: user?.name || 'John Driver',
    vehicle: user?.role === 'business' ? 'Freightliner Cascadia #4082' : 'Tesla Model 3 #9021',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    startTime: '09:15 AM',
    endTime: '10:28 AM',
    duration: '1h 13m',
    distance: '48.2 km',
    avgSpeed: '52 km/h',
    score: 96,
    events: {
      phoneUsage: { detected: true, duration: '12 sec', occurrences: 1 },
      texting: { detected: false, duration: '0 sec', occurrences: 0 },
      drowsiness: { detected: true, duration: '1 min 15 sec', occurrences: 1 },
      smoking: { detected: false, duration: '0 sec', occurrences: 0 },
      seatBelt: 'Always Worn (100% Compliant)',
      eyesOffRoad: { maxDuration: '2.4 sec', avgAttention: '97%' },
      handsOnWheel: '95%',
      yawning: { detected: false },
    },
    performance: {
      focus: 98,
      safety: 95,
      compliance: 100,
      attention: 97,
      reaction: 93,
    },
    incidents: {
      minor: 2,
      major: 0,
      critical: 0,
      nearMisses: 0,
      safeDrivingPct: 98,
    },
    timeline: [
      { time: '09:15 AM', label: 'Ride Started — Engine Ignition Verified', type: 'start' },
      { time: '09:22 AM', label: 'Brief Phone Interaction Detected (12s)', type: 'warning' },
      { time: '09:31 AM', label: 'Eyes Off Road Warning (2.4s)', type: 'warning' },
      { time: '09:48 AM', label: 'AI Fatigue Scan Passed', type: 'success' },
      { time: '10:05 AM', label: 'Safe Following Distance Maintained', type: 'success' },
      { time: '10:15 AM', label: 'Optimal Driving Performance Restored', type: 'success' },
      { time: '10:28 AM', label: 'Ride Completed & Telemetry Saved', type: 'end' },
    ],
    aiInsights: [
      'Excellent driving overall. You maintained active focus for 97% of the ride.',
      'One brief phone usage event was detected at 09:22 AM.',
      'Zero smoking or tobacco usage detected.',
      'Seat belt remained securely fastened throughout the entire trip.',
      'Driver fatigue level remained within low safety parameters.',
    ],
    recommendations: [
      'Avoid using or looking at phone while driving.',
      'Maintain strong forward gaze and eye contact with the road.',
      'Excellent seat belt compliance! Keep up the safe habit.',
      'Keep both hands positioned at 9 and 3 on the steering wheel.',
    ],
  }

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

              <CircularScoreGauge score={rideData.score} />

              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
                  rideData.score >= 90
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : rideData.score >= 80
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}>
                  {rideData.score >= 90 ? 'Excellent Compliance' : rideData.score >= 80 ? 'Good Driving' : 'Attention Required'}
                </span>
                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                  Based on computer vision telemetry and facial distraction analytics.
                </p>
              </div>
            </motion.div>

            {/* AI Insights & Recommendations Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-md space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Sparkles size={18} className="text-primary" />
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-on-surface">AI Driving Analysis</h2>
                </div>

                <div className="space-y-2">
                  {rideData.aiInsights.map((insight: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-on-surface">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations Box */}
              <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Award size={14} /> Recommended Action Items
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-on-surface-variant">
                  {rideData.recommendations.map((rec: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>

          {/* ━━━ DETECTED EVENTS METRICS CARDS ━━━━━━━━━━━━━━━━ */}
          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-on-surface tracking-tight flex items-center gap-2">
              <Zap size={18} className="text-primary" /> Detected Telemetry Events
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Phone Usage */}
              <div className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                    <Smartphone size={18} />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                    rideData.events.phoneUsage.detected
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  }`}>
                    {rideData.events.phoneUsage.detected ? 'DETECTED' : 'NONE'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-on-surface">Phone Usage</h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Duration: <span className="font-bold text-on-surface">{rideData.events.phoneUsage.duration}</span> • {rideData.events.phoneUsage.occurrences} Event
                  </p>
                </div>
              </div>

              {/* Drowsiness */}
              <div className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Eye size={18} />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                    rideData.events.drowsiness.detected
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  }`}>
                    {rideData.events.drowsiness.detected ? 'DETECTED' : 'LOW'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-on-surface">Fatigue & Drowsiness</h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Duration: <span className="font-bold text-on-surface">{rideData.events.drowsiness.duration}</span> • {rideData.events.drowsiness.occurrences} Event
                  </p>
                </div>
              </div>

              {/* Seat Belt */}
              <div className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <ShieldAlert size={18} />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    COMPLIANT
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-on-surface">Seat Belt Compliance</h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">{rideData.events.seatBelt}</p>
                </div>
              </div>

              {/* Eyes On Road */}
              <div className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Eye size={18} />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-primary/10 text-primary border-primary/20">
                    {rideData.events.eyesOffRoad.avgAttention}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-on-surface">Eyes On Road</h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Max Disengagement: <span className="font-bold text-on-surface">{rideData.events.eyesOffRoad.maxDuration}</span>
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* ━━━ PERFORMANCE PROGRESS BARS & TIMELINE ━━━━━━━━━━━ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Driving Performance Metrics */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-md space-y-5">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <TrendingUp size={18} className="text-primary" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-on-surface">Driving Performance Breakdown</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-on-surface">Focus & Attention</span>
                    <span className="text-primary font-mono">{rideData.performance.focus}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface border border-border overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${rideData.performance.focus}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-on-surface">Safety Score</span>
                    <span className="text-emerald-500 font-mono">{rideData.performance.safety}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface border border-border overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rideData.performance.safety}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-on-surface">Seatbelt & Regulatory Compliance</span>
                    <span className="text-emerald-500 font-mono">{rideData.performance.compliance}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface border border-border overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rideData.performance.compliance}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-on-surface">Gaze & Attention Index</span>
                    <span className="text-primary font-mono">{rideData.performance.attention}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface border border-border overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${rideData.performance.attention}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Ride Timeline Card */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm font-extrabold uppercase tracking-wider text-on-surface flex items-center gap-2">
                  <Clock size={18} className="text-primary" /> Session Timeline Log
                </span>
                <span className="text-xs text-on-surface-variant font-mono">{rideData.timeline.length} Events</span>
              </div>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {rideData.timeline.map((item: any, idx: number) => (
                  <div key={idx} className="relative flex items-center justify-between text-xs">
                    <span className={`absolute -left-6 w-2.5 h-2.5 rounded-full border-2 border-card ${
                      item.type === 'warning'
                        ? 'bg-amber-500'
                        : item.type === 'start' || item.type === 'end'
                        ? 'bg-primary'
                        : 'bg-emerald-500'
                    }`} />
                    <span className="font-semibold text-on-surface">{item.label}</span>
                    <span className="font-mono text-[11px] text-on-surface-variant">{item.time}</span>
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
