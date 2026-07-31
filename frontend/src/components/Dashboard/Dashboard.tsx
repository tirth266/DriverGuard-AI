import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Eye,
  EyeOff,
  Activity,
  Hand,
  Radio,
  Gauge,
  Clock,
  MapPin,
  AlertTriangle,
  Camera,
  Maximize2,
  Minimize2,
  CheckCircle2,
  XCircle,
  Zap,
  Flame,
  Fuel,
  BatteryCharging,
  Layers,
  Compass,
  AlertOctagon,
  Sparkles,
} from 'lucide-react'
import { useToast } from '../../context/ToastContext'

const DRIVER_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCcKaLxmdIZwnR0lQmtyJqnulBLej0a0G8kFHVn1alPzu5Bih45tWBAph9k-Y_O-mDBiS96RZ6X6Pm6niij5B-CplXhXHUVFwTuaIm9ON1SnuBg7edeuTBmwyT-UrudvWqkJQYfwkRmLV4JkTFdmL0Za-_fIa5CC0_p2urfVKpFZ5yHicpcA_Xzpw1Baf5ENstaxctcRb9e5Ob1HFkQ9ZCUPonuqkQZT2f-2yawldUCYahojUrdLzzydNygLW_VYW37cVHmdtONPi4'

// Business Activity Log (No developer details)
const RECENT_ACTIVITIES = [
  {
    time: '11:08 AM',
    title: 'Safe Driving Restored',
    category: 'System',
    status: 'Resolved',
    badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    time: '11:05 AM',
    title: 'Seat Belt Removed',
    category: 'Safety Compliance',
    status: 'Critical',
    badgeStyle: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  },
  {
    time: '10:42 AM',
    title: 'Driver Yawn Detected',
    category: 'Fatigue Monitoring',
    status: 'Warning',
    badgeStyle: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  {
    time: '10:25 AM',
    title: 'Phone Usage Detected',
    category: 'Distraction',
    status: 'Resolved',
    badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
]

function CircularGauge({ value, size = 100 }: { value: number; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-border"
        strokeWidth={7}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#2563eb"
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
      />
    </svg>
  )
}

const Dashboard = memo(function Dashboard() {
  const [cameraFullscreen, setCameraFullscreen] = useState(false)
  const [isRecording, setIsRecording] = useState(true)
  const [activeAlert, setActiveAlert] = useState<string | null>(null)
  const toast = useToast()

  // Handle Snapshot action
  const handleSnapshot = () => {
    toast.success('Camera Snapshot Saved', 'High-res frame saved to incident logs.')
  }

  // Trigger alert simulation
  const triggerAlert = (type: 'phone' | 'fatigue' | 'seatbelt') => {
    if (type === 'phone') {
      setActiveAlert('⚠️ Phone Usage Alert: Driver holding mobile device.')
      toast.error('SAFETY ALERT', '⚠️ Driver using mobile phone.')
    } else if (type === 'fatigue') {
      setActiveAlert('💤 Fatigue Alert: Driver showing repeated yawning.')
      toast.error('FATIGUE WARNING', '💤 Driver drowsiness detected.')
    } else {
      setActiveAlert('🛑 Seat Belt Warning: Driver seat belt unbuckled.')
      toast.error('SAFETY WARNING', '🛑 Seat belt unbuckled.')
    }

    setTimeout(() => {
      setActiveAlert(null)
    }, 4500)
  }

  return (
    <div
      className="w-full min-h-[calc(100vh-56px)] bg-background text-on-surface p-3 md:p-5 flex flex-col gap-5 transition-colors duration-300"
      aria-label="Commercial Fleet Monitoring Dashboard"
    >
      {/* Active Alert Toast Banner */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            className="w-full bg-rose-500 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between font-semibold text-sm border border-rose-400"
          >
            <div className="flex items-center gap-3">
              <AlertOctagon size={20} className="animate-bounce" />
              <span>{activeAlert}</span>
            </div>
            <button
              onClick={() => setActiveAlert(null)}
              className="text-white/80 hover:text-white text-xs underline font-bold"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP SECTION: Main Grid Layout (Left 70% Camera + Right 30% Telemetry) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
        {/* ── LEFT COLUMN (70% Width on Desktop) — Large AI Camera Feed ── */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Large Camera Container */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl flex flex-col relative transition-colors duration-300">
            {/* Camera Header Toolbar */}
            <div className="px-4 py-3 bg-surface border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" /> LIVE 1080P
                </span>
                <span className="font-mono text-on-surface-variant font-medium text-xs">CAM-01 • CABIN INFRARED</span>
              </div>

              {/* Toolbar Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                    isRecording
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      : 'bg-surface text-on-surface-variant border-border'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-gray-400'}`} />
                  {isRecording ? 'REC' : 'PAUSED'}
                </button>

                <button
                  onClick={handleSnapshot}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-card border border-border text-on-surface-variant hover:text-on-surface transition-colors font-medium text-xs"
                  title="Capture Snapshot"
                >
                  <Camera size={14} />
                  <span className="hidden sm:inline">Snapshot</span>
                </button>

                <button
                  onClick={() => setCameraFullscreen(!cameraFullscreen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors font-medium text-xs"
                  title="Expand Camera Feed"
                >
                  <Maximize2 size={14} />
                  <span className="hidden sm:inline">Expand</span>
                </button>
              </div>
            </div>

            {/* Video Image & AI Bounding Overlay */}
            <div className="relative aspect-[16/9] bg-black overflow-hidden group">
              <img
                src={DRIVER_IMAGE}
                alt="Live Driver Safety AI Monitoring Camera Feed"
                className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.01]"
              />

              {/* HUD Bounding Box Overlay */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 550 380"
                preserveAspectRatio="none"
              >
                <rect x="170" y="30" width="200" height="180" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.9" />
                <rect x="120" y="150" width="310" height="200" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.7" />
                <line x1="170" y1="30" x2="190" y2="30" stroke="#22c55e" strokeWidth="2.5" />
                <line x1="170" y1="30" x2="170" y2="50" stroke="#22c55e" strokeWidth="2.5" />
                <line x1="370" y1="30" x2="350" y2="30" stroke="#22c55e" strokeWidth="2.5" />
                <line x1="370" y1="30" x2="370" y2="50" stroke="#22c55e" strokeWidth="2.5" />
                <circle cx="265" cy="85" r="3.5" fill="#22c55e" />
                <circle cx="240" cy="160" r="3" fill="#3b82f6" />
                <circle cx="290" cy="160" r="3" fill="#3b82f6" />
                <line x1="265" y1="85" x2="240" y2="160" stroke="#3b82f6" strokeWidth="1.2" opacity="0.6" />
                <line x1="265" y1="85" x2="290" y2="160" stroke="#3b82f6" strokeWidth="1.2" opacity="0.6" />
              </svg>

              {/* Scanning Laser Animation */}
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent pointer-events-none"
                animate={{ top: ['5%', '92%', '5%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />

              {/* Top Corner Live Overlay */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white flex items-center gap-2 text-xs font-mono">
                <Radio size={14} className="text-emerald-400 animate-pulse" />
                <span>AI SAFETY GUARD ACTIVE</span>
              </div>
            </div>

            {/* Camera Bottom Status Bar */}
            <div className="px-4 py-2.5 bg-surface border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant font-medium">
              <div className="flex items-center gap-4">
                <span>
                  STREAM: <span className="text-emerald-500 font-bold">1080P HD</span>
                </span>
                <span>
                  DRIVER ID: <span className="text-emerald-500 font-bold">VERIFIED</span>
                </span>
              </div>
              <span className="font-semibold text-on-surface">DRIVER #4082 — JOHN DRIVER</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (30% Width on Desktop) — Commercial Fleet Panel ── */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Driver Status Card */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-lg space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Driver Operational Status
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" /> SAFE / OPTIMAL
              </span>
            </div>

            {/* Circular Safety Score Gauge */}
            <div className="flex items-center gap-5 p-4 rounded-xl bg-surface border border-border">
              <div className="relative flex-shrink-0">
                <CircularGauge value={98} size={90} />
                <div className="absolute inset-0 flex items-center justify-center rotate-[90deg]">
                  <span className="text-base font-extrabold text-primary">98%</span>
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                  Safety Score
                </span>
                <span className="text-2xl font-extrabold text-on-surface font-mono">98 / 100</span>
                <p className="text-xs text-emerald-500 font-semibold mt-1">Top 5% Fleet Rating</p>
              </div>
            </div>

            {/* Driver Attention Checklist */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-surface border border-border">
                <span className="text-on-surface-variant font-medium">Seat Belt Status</span>
                <span className="flex items-center gap-1 text-emerald-500 font-bold">
                  <CheckCircle2 size={14} /> COMPLIANT
                </span>
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-surface border border-border">
                <span className="text-on-surface-variant font-medium">Phone Usage</span>
                <span className="flex items-center gap-1 text-emerald-500 font-bold">
                  <CheckCircle2 size={14} /> NONE DETECTED
                </span>
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-surface border border-border">
                <span className="text-on-surface-variant font-medium">Smoking Detection</span>
                <span className="flex items-center gap-1 text-emerald-500 font-bold">
                  <CheckCircle2 size={14} /> NONE
                </span>
              </div>

              {/* Drowsiness Progress */}
              <div className="p-2.5 rounded-xl bg-surface border border-border space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant font-medium">Drowsiness Level</span>
                  <span className="text-emerald-500 font-bold">LOW (2%)</span>
                </div>
                <div className="w-full h-1.5 bg-card border border-border rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[2%]" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-surface border border-border">
                <span className="text-on-surface-variant font-medium">Eyes on Road</span>
                <span className="text-emerald-500 font-bold uppercase">FOCUSED</span>
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-surface border border-border">
                <span className="text-on-surface-variant font-medium">Hands on Wheel</span>
                <div className="flex items-center gap-1">
                  <Hand size={14} className="text-emerald-500" />
                  <span className="text-emerald-500 font-bold uppercase">BOTH HANDS</span>
                </div>
              </div>
            </div>

            {/* Test Safety Alert Simulation */}
            <div className="pt-2 border-t border-border">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
                Simulate Fleet Alerts
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => triggerAlert('phone')}
                  className="py-1.5 px-2 rounded-lg bg-surface hover:bg-rose-500/10 border border-border hover:border-rose-500/30 text-[11px] font-semibold text-on-surface-variant hover:text-rose-500 transition-colors"
                >
                  Phone Alert
                </button>
                <button
                  onClick={() => triggerAlert('fatigue')}
                  className="py-1.5 px-2 rounded-lg bg-surface hover:bg-amber-500/10 border border-border hover:border-amber-500/30 text-[11px] font-semibold text-on-surface-variant hover:text-amber-500 transition-colors"
                >
                  Fatigue
                </button>
                <button
                  onClick={() => triggerAlert('seatbelt')}
                  className="py-1.5 px-2 rounded-lg bg-surface hover:bg-rose-500/10 border border-border hover:border-rose-500/30 text-[11px] font-semibold text-on-surface-variant hover:text-rose-500 transition-colors"
                >
                  Seat Belt
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTION 1: Operational Telemetry Metric Cards (9 Metric Cards Grid) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3.5 w-full">
        {/* Speed */}
        <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm hover:border-primary/50 transition-all space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-bold uppercase tracking-wider">Speed</span>
            <Gauge size={14} className="text-primary" />
          </div>
          <p className="text-lg font-extrabold text-on-surface font-mono">62 mph</p>
          <span className="text-[10px] text-emerald-500 font-semibold block">Optimal Speed</span>
        </div>

        {/* Trip Time */}
        <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm hover:border-primary/50 transition-all space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-bold uppercase tracking-wider">Trip Time</span>
            <Clock size={14} className="text-primary" />
          </div>
          <p className="text-lg font-extrabold text-on-surface font-mono">2h 45m</p>
          <span className="text-[10px] text-on-surface-variant block">Started 08:30 AM</span>
        </div>

        {/* Distance */}
        <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm hover:border-primary/50 transition-all space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-bold uppercase tracking-wider">Distance</span>
            <Compass size={14} className="text-primary" />
          </div>
          <p className="text-lg font-extrabold text-on-surface font-mono">142.8 mi</p>
          <span className="text-[10px] text-on-surface-variant block">Route I-95 N</span>
        </div>

        {/* Safety Score */}
        <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm hover:border-primary/50 transition-all space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-bold uppercase tracking-wider">Safety Score</span>
            <Shield size={14} className="text-emerald-500" />
          </div>
          <p className="text-lg font-extrabold text-emerald-500 font-mono">98 / 100</p>
          <span className="text-[10px] text-emerald-500 font-semibold block">Excellent</span>
        </div>

        {/* Alerts Today */}
        <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm hover:border-primary/50 transition-all space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-bold uppercase tracking-wider">Alerts Today</span>
            <AlertTriangle size={14} className="text-amber-500" />
          </div>
          <p className="text-lg font-extrabold text-on-surface font-mono">1 Minor</p>
          <span className="text-[10px] text-amber-500 font-semibold block">Fatigue Alert</span>
        </div>

        {/* Fuel Level */}
        <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm hover:border-primary/50 transition-all space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-bold uppercase tracking-wider">Fuel Level</span>
            <Fuel size={14} className="text-primary" />
          </div>
          <p className="text-lg font-extrabold text-on-surface font-mono">78%</p>
          <span className="text-[10px] text-emerald-500 font-semibold block">Range 410 mi</span>
        </div>

        {/* Engine Status */}
        <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm hover:border-primary/50 transition-all space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-bold uppercase tracking-wider">Engine</span>
            <Flame size={14} className="text-emerald-500" />
          </div>
          <p className="text-lg font-extrabold text-on-surface font-mono">OPTIMAL</p>
          <span className="text-[10px] text-on-surface-variant block">Temp 195°F</span>
        </div>

        {/* GPS */}
        <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm hover:border-primary/50 transition-all space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-bold uppercase tracking-wider">GPS</span>
            <MapPin size={14} className="text-emerald-500" />
          </div>
          <p className="text-lg font-extrabold text-emerald-500 font-mono">ACTIVE</p>
          <span className="text-[10px] text-on-surface-variant block">12 Satellites</span>
        </div>

        {/* Battery */}
        <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm hover:border-primary/50 transition-all space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-bold uppercase tracking-wider">Battery</span>
            <BatteryCharging size={14} className="text-emerald-500" />
          </div>
          <p className="text-lg font-extrabold text-on-surface font-mono">14.2 V</p>
          <span className="text-[10px] text-emerald-500 font-semibold block">Charging</span>
        </div>
      </div>

      {/* ── BOTTOM SECTION 2: Modern Activity Feed (Replaces Technical Timeline) ── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-lg space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface">
              Recent Fleet Activity & Alert Feed
            </h3>
          </div>
          <span className="text-xs text-on-surface-variant">Updated just now</span>
        </div>

        {/* Activity Items List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {RECENT_ACTIVITIES.map((act) => (
            <div
              key={act.time + act.title}
              className="p-3.5 rounded-xl bg-surface border border-border space-y-2 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-on-surface">{act.time}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${act.badgeStyle}`}>
                  {act.status}
                </span>
              </div>
              <p className="text-xs font-bold text-on-surface">{act.title}</p>
              <span className="text-[10px] text-on-surface-variant block">{act.category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fullscreen Camera Modal ── */}
      <AnimatePresence>
        {cameraFullscreen && (
          <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-black/80 backdrop-blur-md flex items-center justify-between text-white border-b border-white/10 z-10">
              <div className="flex items-center gap-3">
                <Radio size={16} className="text-emerald-400 animate-pulse" />
                <span className="font-bold text-sm font-mono">FULLSCREEN AI CABIN MONITORING • CAM-01</span>
              </div>
              <button
                onClick={() => setCameraFullscreen(false)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Minimize2 size={14} /> Exit Fullscreen
              </button>
            </div>

            {/* Modal Feed */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
              <img
                src={DRIVER_IMAGE}
                alt="Full Screen Camera Feed"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
})

export default Dashboard
