import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Radio,
  Camera,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertOctagon,
  Eye,
  Smartphone,
  ShieldAlert,
} from 'lucide-react'
import { useToast } from '../../context/ToastContext'

/* ─── Constants ─────────────────────────────────────────── */

const DRIVER_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCcKaLxmdIZwnR0lQmtyJqnulBLej0a0G8kFHVn1alPzu5Bih45tWBAph9k-Y_O-mDBiS96RZ6X6Pm6niij5B-CplXhXHUVFwTuaIm9ON1SnuBg7edeuTBmwyT-UrudvWqkJQYfwkRmLV4JkTFdmL0Za-_fIa5CC0_p2urfVKpFZ5yHicpcA_Xzpw1Baf5ENstaxctcRb9e5Ob1HFkQ9ZCUPonuqkQZT2f-2yawldUCYahojUrdLzzydNygLW_VYW37cVHmdtONPi4'

const EVENTS = [
  { time: '11:08 AM', label: 'Safe Driving Restored', color: 'text-emerald-500', dot: 'bg-emerald-500' },
  { time: '11:05 AM', label: 'Seat Belt Removed', color: 'text-rose-500', dot: 'bg-rose-500' },
  { time: '10:42 AM', label: 'Drowsiness Warning', color: 'text-amber-500', dot: 'bg-amber-500' },
  { time: '10:31 AM', label: 'Phone Usage Detected', color: 'text-rose-500', dot: 'bg-rose-500' },
  { time: '10:20 AM', label: 'Eyes Off Road – Brief', color: 'text-amber-500', dot: 'bg-amber-400' },
]

/* ─── Safety score gauge ─────────────────────────────────── */

function CircularGauge({ value, size = 88 }: { value: number; size?: number }) {
  const radius = (size - 10) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (value / 100) * circ
  return (
    <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor"
        className="text-border" strokeWidth={7} />
      <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#2563eb"
        strokeWidth={7} strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }} />
    </svg>
  )
}

/* ─── Status row helper ──────────────────────────────────── */

function StatusRow({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2">
      <span className="text-xs text-on-surface-variant font-medium">{label}</span>
      <span className={`flex items-center gap-1 text-xs font-bold ${ok ? 'text-emerald-500' : 'text-rose-500'}`}>
        <CheckCircle2 size={13} className={ok ? '' : 'hidden'} />
        {note ?? (ok ? 'OK' : 'ALERT')}
      </span>
    </div>
  )
}

/* ─── Main Dashboard ─────────────────────────────────────── */

const Dashboard = memo(function Dashboard() {
  const [cameraFull, setCameraFull] = useState(false)
  const [isRecording, setIsRecording] = useState(true)
  const [activeAlert, setActiveAlert] = useState<string | null>(null)
  const toast = useToast()

  const triggerAlert = (type: 'phone' | 'fatigue' | 'seatbelt') => {
    const messages = {
      phone: ['⚠️ Phone usage detected', 'Driver using mobile phone.'],
      fatigue: ['💤 Fatigue detected', 'Driver drowsiness level rising.'],
      seatbelt: ['🛑 Seat belt removed', 'Driver seat belt is unbuckled.'],
    }
    setActiveAlert(messages[type][0])
    toast.error('SAFETY ALERT', messages[type][1])
    setTimeout(() => setActiveAlert(null), 5000)
  }

  const handleSnapshot = () => toast.success('Snapshot Saved', 'Frame saved to incident log.')

  return (
    <div className="w-full min-h-[calc(100vh-56px)] bg-background flex flex-col gap-0 transition-colors duration-300">

      {/* ── ALERT BANNER ──────────────────────────────────── */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mt-4 flex items-center justify-between bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold"
          >
            <div className="flex items-center gap-2.5">
              <AlertOctagon size={18} className="animate-bounce flex-shrink-0" />
              {activeAlert}
            </div>
            <button onClick={() => setActiveAlert(null)}
              className="text-white/80 hover:text-white text-xs underline font-bold ml-4 flex-shrink-0">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN GRID: Camera 80% | Safety Panel 20% ─────── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">

        {/* ━━━ LEFT: LARGE CAMERA FEED ━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex-1 lg:w-[80%] flex flex-col gap-4 min-w-0">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl flex flex-col h-full transition-colors">

            {/* Camera toolbar */}
            <div className="px-4 py-3 bg-surface border-b border-border flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" /> LIVE 1080P
                </span>
                <span className="text-xs font-mono text-on-surface-variant font-medium hidden sm:block">
                  CAM-01 • CABIN INFRARED
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setIsRecording(r => !r)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${isRecording ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-surface text-on-surface-variant border-border'}`}>
                  <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-gray-400'}`} />
                  {isRecording ? 'REC' : 'PAUSED'}
                </button>

                <button onClick={handleSnapshot}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-card border border-border text-on-surface-variant hover:text-on-surface transition-colors text-xs font-medium">
                  <Camera size={13} />
                  <span className="hidden sm:inline">Snapshot</span>
                </button>

                <button onClick={() => setCameraFull(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity text-xs font-medium">
                  <Maximize2 size={13} />
                  <span className="hidden sm:inline">Expand</span>
                </button>
              </div>
            </div>

            {/* Feed */}
            <div className="relative bg-black flex-1 overflow-hidden group" style={{ minHeight: '300px' }}>
              <img src={DRIVER_IMAGE} alt="Live Driver Monitoring Feed"
                className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.01]" />

              {/* AI bounding overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 550 380" preserveAspectRatio="none">
                <rect x="170" y="30" width="200" height="180" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.9" />
                <rect x="120" y="150" width="310" height="200" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.7" />
                <line x1="170" y1="30" x2="190" y2="30" stroke="#22c55e" strokeWidth="2.5" />
                <line x1="170" y1="30" x2="170" y2="50" stroke="#22c55e" strokeWidth="2.5" />
                <line x1="370" y1="30" x2="350" y2="30" stroke="#22c55e" strokeWidth="2.5" />
                <line x1="370" y1="30" x2="370" y2="50" stroke="#22c55e" strokeWidth="2.5" />
              </svg>

              {/* Scanning laser */}
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent pointer-events-none"
                animate={{ top: ['3%', '94%', '3%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              />

              {/* HUD label */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white flex items-center gap-2 text-xs font-mono">
                <Radio size={13} className="text-emerald-400 animate-pulse" />
                AI SAFETY GUARD ACTIVE
              </div>
            </div>

            {/* Status bar */}
            <div className="px-4 py-2 bg-surface border-t border-border flex items-center justify-between text-xs text-on-surface-variant font-medium flex-shrink-0">
              <div className="flex items-center gap-4">
                <span>STREAM: <span className="text-emerald-500 font-bold">1080P HD</span></span>
                <span className="hidden sm:block">DRIVER: <span className="text-emerald-500 font-bold">VERIFIED</span></span>
              </div>
              <span className="font-semibold text-on-surface text-xs">FLEET #4082 — JOHN DRIVER</span>
            </div>
          </div>
        </div>

        {/* ━━━ RIGHT: SAFETY PANEL 20% ━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="w-full lg:w-[20%] lg:min-w-[220px] lg:max-w-[280px] flex flex-col gap-4">

          {/* Driver Status Badge */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-lg transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Driver Status</span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" /> SAFE
              </span>
            </div>

            {/* Gauge */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-surface border border-border">
              <div className="relative flex-shrink-0">
                <CircularGauge value={98} size={80} />
                <div className="absolute inset-0 flex items-center justify-center rotate-[90deg]">
                  <span className="text-sm font-extrabold text-primary">98%</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-0.5">Safety Score</span>
                <span className="text-xl font-extrabold text-on-surface font-mono">98<span className="text-sm text-primary font-medium">/100</span></span>
                <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">Top 5% Rating</p>
              </div>
            </div>

            {/* Compliance checklist */}
            <div className="space-y-0">
              <StatusRow label="Seat Belt" ok={true} note="COMPLIANT" />
              <StatusRow label="Phone Usage" ok={true} note="NONE" />
              <StatusRow label="Smoking" ok={true} note="NONE" />
              <div className="py-2 border-b border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-on-surface-variant font-medium">Drowsiness</span>
                  <span className="text-xs font-bold text-emerald-500">LOW 2%</span>
                </div>
                <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '2%' }} />
                </div>
              </div>
              <StatusRow label="Eyes on Road" ok={true} note="FOCUSED" />
              <StatusRow label="Hands on Wheel" ok={true} note="BOTH" />
            </div>

            {/* Current Alert */}
            <div className="mt-4 pt-3 border-t border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-2">Current Alert</span>
              <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
                <CheckCircle2 size={14} /> No Active Alerts
              </div>
            </div>

            {/* Alert simulator */}
            <div className="mt-4 pt-3 border-t border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-2">Simulate Alert</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Phone', icon: Smartphone, type: 'phone' as const },
                  { label: 'Fatigue', icon: Eye, type: 'fatigue' as const },
                  { label: 'Belt', icon: ShieldAlert, type: 'seatbelt' as const },
                ].map(({ label, icon: Icon, type }) => (
                  <button key={label} onClick={() => triggerAlert(type)}
                    className="py-1.5 rounded-lg bg-surface hover:bg-rose-500/10 border border-border hover:border-rose-500/30 text-[10px] font-semibold text-on-surface-variant hover:text-rose-500 transition-colors flex flex-col items-center gap-1">
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM: RECENT SAFETY EVENTS (slim card) ──────── */}
      <div className="mx-4 mb-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
              <Shield size={14} className="text-primary" />
              Recent Safety Events
            </span>
            <span className="text-[10px] text-on-surface-variant">Last 5 events</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {EVENTS.map((ev) => (
              <div key={ev.time + ev.label}
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border hover:border-primary/30 transition-colors min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.dot}`} />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-on-surface truncate">{ev.label}</p>
                  <span className="text-[10px] text-on-surface-variant font-mono">{ev.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FULLSCREEN MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {cameraFull && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col"
          >
            <div className="h-12 bg-black/80 backdrop-blur-md px-4 flex items-center justify-between text-white border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Radio size={15} className="text-emerald-400 animate-pulse" />
                <span className="font-bold text-sm font-mono">FULLSCREEN MONITORING • CAM-01 • DRIVER #4082</span>
              </div>
              <button onClick={() => setCameraFull(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors">
                <Minimize2 size={14} /> Exit
              </button>
            </div>
            <div className="flex-1 relative overflow-hidden">
              <img src={DRIVER_IMAGE} alt="Fullscreen feed" className="w-full h-full object-contain" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

export default Dashboard
