import { memo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio,
  Camera,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertOctagon,
  Eye,
  Smartphone,
  ShieldAlert,
  StopCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import WebcamFeed from './WebcamFeed'

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
  const [showEndRideModal, setShowEndRideModal] = useState(false)
  
  // Real-time telemetry state updated by live OpenCV camera feed
  const [telemetry, setTelemetry] = useState({
    score: 98,
    eyesOnRoad: true,
    phoneDetected: false,
    seatbeltOk: true,
    drowsiness: 2,
    faceDetected: true,
  })

  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const handleTelemetryUpdate = useCallback((newTelemetry: any) => {
    setTelemetry(prev => ({ ...prev, ...newTelemetry }))
  }, [])

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

  const handleSnapshot = () => toast.success('Snapshot Saved', 'Live webcam frame saved to incident log.')

  // End Ride Action
  const handleConfirmEndRide = () => {
    setShowEndRideModal(false)
    toast.success('Ride Ended Successfully', 'Live monitoring session saved.')
    const isBiz = user?.role === 'business' || user?.accountType === 'business'
    const targetDashboard = isBiz ? '/business/dashboard' : '/personal/dashboard'
    navigate(targetDashboard)
  }

  return (
    <div className="w-full h-full max-h-full overflow-y-auto bg-background flex flex-col gap-0 transition-colors duration-300 p-4">

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
              className="text-white/80 hover:text-white text-xs font-bold underline ml-4">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN DASHBOARD GRID ───────────────────────────── */}
      <div className="p-4 md:p-6 flex flex-col lg:flex-row gap-6">

        {/* ━━━ LEFT: LARGE CAMERA FEED ━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex-1 lg:w-[80%] flex flex-col gap-4 min-w-0">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl flex flex-col h-full transition-colors">

            {/* Camera toolbar: REC | Snapshot | Expand | End Ride */}
            <div className="px-4 py-3 bg-surface border-b border-border flex items-center justify-between gap-3 overflow-visible flex-nowrap flex-shrink-0">
              <div className="flex items-center gap-3 flex-shrink min-w-0">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-[11px] flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" /> LIVE 1080P
                </span>
                <span className="text-xs font-mono text-on-surface-variant font-medium hidden sm:block truncate">
                  WEBCAM CAM-01 • CABIN INFRARED
                </span>
              </div>

              <div className="flex items-center gap-2 flex-nowrap overflow-visible flex-shrink-0">
                {/* REC Button */}
                <button onClick={() => setIsRecording(r => !r)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors flex-shrink-0 ${isRecording ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-surface text-on-surface-variant border-border'}`}>
                  <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-gray-400'}`} />
                  {isRecording ? 'REC' : 'PAUSED'}
                </button>

                {/* Snapshot Button */}
                <button onClick={handleSnapshot}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-card border border-border text-on-surface-variant hover:text-on-surface transition-colors text-xs font-medium flex-shrink-0">
                  <Camera size={13} />
                  <span className="hidden sm:inline">Snapshot</span>
                </button>

                {/* Expand Button */}
                <button onClick={() => setCameraFull(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity text-xs font-medium flex-shrink-0">
                  <Maximize2 size={13} />
                  <span className="hidden sm:inline">Expand</span>
                </button>

                {/* STEP 7: END RIDE BUTTON */}
                <button
                  onClick={() => setShowEndRideModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-1.5 flex-shrink-0 whitespace-nowrap z-50 flex items-center gap-1.5 text-xs font-bold shadow-md hover:shadow-red-600/20 transition-all cursor-pointer"
                  title="End current ride session"
                >
                  <StopCircle size={14} />
                  <span>End Ride</span>
                </button>
              </div>
            </div>

            {/* LIVE WEBCAM FEED COMPONENT */}
            <WebcamFeed
              isRecording={isRecording}
              onTelemetryUpdate={handleTelemetryUpdate}
              className="flex-1 min-h-[360px]"
            />

            {/* Status bar */}
            <div className="px-4 py-2 bg-surface border-t border-border flex items-center justify-between text-xs text-on-surface-variant font-medium flex-shrink-0">
              <div className="flex items-center gap-4">
                <span>STREAM: <span className="text-emerald-500 font-bold">LIVE WEBCAM</span></span>
                <span className="hidden sm:block">AI STATUS: <span className="text-emerald-500 font-bold">{telemetry.faceDetected ? 'DRIVER VERIFIED' : 'SEARCHING'}</span></span>
              </div>
              <span className="font-semibold text-on-surface text-xs">FLEET #4082 — LIVE DRIVER MONITORING</span>
            </div>
          </div>
        </div>

        {/* ━━━ RIGHT: TELEMETRY & EVENTS ━━━━━━━━━━━━━━━━━━━ */}
        <div className="w-full lg:w-80 flex flex-col gap-5 flex-shrink-0">
          
          {/* Safety Score Card */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Driver Safety Score</span>
              <span className="text-[11px] text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/20">LIVE</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <CircularGauge value={telemetry.score} size={80} />
                <div className="absolute inset-0 flex items-center justify-center rotate-[90deg]">
                  <span className="text-lg font-extrabold text-on-surface font-mono">{telemetry.score}</span>
                </div>
              </div>
              <div>
                <p className="text-xl font-extrabold text-on-surface tracking-tight">
                  {telemetry.score >= 90 ? 'Excellent' : telemetry.score >= 80 ? 'Good' : 'Needs Care'}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">Top 5% safest driver</p>
              </div>
            </div>
          </div>

          {/* Realtime AI Detection Metrics */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-border pb-2">
              Realtime AI Detection Metrics
            </h3>

            <div className="space-y-1">
              <StatusRow label="Face Detected" ok={telemetry.faceDetected} note={telemetry.faceDetected ? 'VERIFIED' : 'SEARCHING'} />
              <StatusRow label="Eyes On Road" ok={telemetry.eyesOnRoad} note={telemetry.eyesOnRoad ? 'FOCUSED' : 'DISTRACTED'} />
              <StatusRow label="Phone Usage" ok={!telemetry.phoneDetected} note={telemetry.phoneDetected ? 'DETECTED' : 'CLEAR'} />
              <StatusRow label="Seat Belt Fastened" ok={telemetry.seatbeltOk} note={telemetry.seatbeltOk ? 'BUCKLED' : 'UNBUCKLED'} />
              <StatusRow label="Drowsiness Level" ok={telemetry.drowsiness < 30} note={`${telemetry.drowsiness}%`} />
            </div>

            {/* Test alert trigger buttons */}
            <div className="pt-2 border-t border-border">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Simulate AI Detections</p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => triggerAlert('phone')}
                  className="px-2 py-1.5 rounded-lg bg-surface hover:bg-card border border-border text-[10px] font-semibold text-on-surface flex flex-col items-center gap-1 transition-colors"
                >
                  <Smartphone size={12} className="text-rose-500" />
                  Phone
                </button>
                <button
                  onClick={() => triggerAlert('fatigue')}
                  className="px-2 py-1.5 rounded-lg bg-surface hover:bg-card border border-border text-[10px] font-semibold text-on-surface flex flex-col items-center gap-1 transition-colors"
                >
                  <Eye size={12} className="text-amber-500" />
                  Fatigue
                </button>
                <button
                  onClick={() => triggerAlert('seatbelt')}
                  className="px-2 py-1.5 rounded-lg bg-surface hover:bg-card border border-border text-[10px] font-semibold text-on-surface flex flex-col items-center gap-1 transition-colors"
                >
                  <ShieldAlert size={12} className="text-rose-500" />
                  Seatbelt
                </button>
              </div>
            </div>
          </div>

          {/* Recent Event Log */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-border pb-2">
              Recent Events Log
            </h3>
            <div className="space-y-2.5">
              {EVENTS.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.dot}`} />
                  <span className="font-mono text-on-surface-variant text-[11px]">{ev.time}</span>
                  <span className={`font-semibold ${ev.color}`}>{ev.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ━━━ END RIDE CONFIRMATION MODAL ━━━ */}
      <AnimatePresence>
        {showEndRideModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEndRideModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              className="relative w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl z-10 space-y-4 text-on-surface"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 flex-shrink-0">
                  <StopCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">End current ride?</h3>
                  <p className="text-xs text-on-surface-variant">Live telemetry session</p>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                This will stop monitoring and save the trip.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEndRideModal(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-card text-on-surface text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEndRide}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <StopCircle size={14} />
                  End Ride
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Camera Modal */}
      <AnimatePresence>
        {cameraFull && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col"
          >
            <div className="h-12 bg-black/80 backdrop-blur-md px-4 flex items-center justify-between text-white border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-emerald-400 animate-pulse" />
                <span className="font-bold text-sm font-mono">LIVE WEBCAM CAM-01 • CABIN INFRARED</span>
              </div>
              <button
                onClick={() => setCameraFull(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
              >
                <Minimize2 size={14} /> Exit Fullscreen
              </button>
            </div>
            <div className="flex-1 relative overflow-hidden">
              <WebcamFeed isRecording={isRecording} onTelemetryUpdate={handleTelemetryUpdate} className="w-full h-full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
})

export default Dashboard
