import { memo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
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
  { time: '11:08 AM', label: 'Safe Driving Restored', color: 'text-safe', dot: 'bg-safe' },
  { time: '11:05 AM', label: 'Seat Belt Removed', color: 'text-danger', dot: 'bg-danger' },
  { time: '10:42 AM', label: 'Drowsiness Warning', color: 'text-warning', dot: 'bg-warning' },
  { time: '10:31 AM', label: 'Phone Usage Detected', color: 'text-danger', dot: 'bg-danger' },
  { time: '10:20 AM', label: 'Eyes Off Road – Brief', color: 'text-warning', dot: 'bg-warning' },
]

/* ─── Safety score gauge ─────────────────────────────────── */

function CircularGauge({ value, size = 80 }: { value: number; size?: number }) {
  const radius = (size - 10) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (value / 100) * circ
  return (
    <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-border/60"
        strokeWidth={6}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#20D98B"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.1, ease: 'easeOut', delay: 0.1 }}
      />
    </svg>
  )
}

/* ─── Status row helper ──────────────────────────────────── */

function StatusRow({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/70 last:border-0 gap-2">
      <span className="text-xs text-text-secondary font-medium">{label}</span>
      <span className={`flex items-center gap-1 font-mono text-[11px] font-bold ${ok ? 'text-safe' : 'text-danger'}`}>
        <CheckCircle2 size={12} className={ok ? '' : 'hidden'} />
        {note ?? (ok ? 'OK' : 'ALERT')}
      </span>
    </div>
  )
}

/* ─── Main Dashboard ─────────────────────────────────────── */

export default memo(function Dashboard() {
  const [cameraFull, setCameraFull] = useState(false)
  const [isRecording, setIsRecording] = useState(true)
  const [activeAlert, setActiveAlert] = useState<string | null>(null)
  const [showEndRideModal, setShowEndRideModal] = useState(false)
  
  // Real-time telemetry state updated by live OpenCV / YOLO11 camera feed
  const [telemetry, setTelemetry] = useState({
    score: 98,
    eyesOnRoad: true,
    phoneDetected: false,
    seatbeltOk: true,
    drowsiness: 2,
    faceDetected: true,
    detections: [] as any[],
    className: 'Safe Driving',
    confidence: 0.98,
    isDistracted: false,
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
    toast.success('Ride Ended Successfully', 'Redirecting to AI driving report...')
    const isBiz = user?.role === 'business' || user?.accountType === 'business'
    const targetSummary = isBiz ? '/business/ride-summary' : '/personal/ride-summary'
    navigate(targetSummary, {
      state: {
        rideData: {
          driverName: user?.name || 'Personal Driver',
          vehicle: 'Tesla Model 3 #9021',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          startTime: '09:15 AM',
          endTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          duration: '1h 13m',
          distance: '48.2 km',
          avgSpeed: '52 km/h',
          score: telemetry.score,
          events: {
            phoneUsage: { detected: telemetry.phoneDetected, duration: telemetry.phoneDetected ? '12 sec' : '0 sec', occurrences: telemetry.phoneDetected ? 1 : 0 },
            texting: { detected: false, duration: '0 sec', occurrences: 0 },
            drowsiness: { detected: telemetry.drowsiness > 15, duration: `${telemetry.drowsiness} sec`, occurrences: telemetry.drowsiness > 15 ? 1 : 0 },
            smoking: { detected: false, duration: '0 sec', occurrences: 0 },
            seatBelt: telemetry.seatbeltOk ? 'Always Worn (100% Compliant)' : 'Unbuckled during trip',
            eyesOffRoad: { maxDuration: '2.4 sec', avgAttention: '97%' },
            handsOnWheel: '95%',
            yawning: { detected: false },
          },
          performance: {
            focus: telemetry.eyesOnRoad ? 98 : 82,
            safety: telemetry.score,
            compliance: telemetry.seatbeltOk ? 100 : 70,
            attention: telemetry.eyesOnRoad ? 97 : 80,
            reaction: 93,
          },
          incidents: {
            minor: telemetry.phoneDetected ? 1 : 0,
            major: 0,
            critical: 0,
            nearMisses: 0,
            safeDrivingPct: telemetry.score,
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
            `Overall safety score: ${telemetry.score}/100.`,
            telemetry.phoneDetected ? 'Phone interaction detected during monitoring.' : 'Zero mobile phone distraction detected.',
            telemetry.seatbeltOk ? 'Seat belt remained securely fastened.' : 'Seat belt unbuckled warning triggered.',
            'Fatigue and drowsiness level remained low.',
          ],
          recommendations: [
            'Maintain strong forward eye gaze.',
            'Keep both hands positioned on steering wheel.',
            'Continue excellent safety compliance.',
          ],
        }
      }
    })
  }

  return (
    <div className="w-full h-full flex-1 max-h-full overflow-y-auto bg-background flex flex-col p-4 md:p-6 text-text-primary">

      {/* ── ALERT BANNER ──────────────────────────────────── */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-4 flex items-center justify-between bg-danger text-white px-4 py-2.5 rounded-[12px] shadow-md text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <AlertOctagon size={16} className="flex-shrink-0" />
              <span>{activeAlert}</span>
            </div>
            <button
              onClick={() => setActiveAlert(null)}
              className="text-white/80 hover:text-white text-xs underline font-medium ml-4"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN DASHBOARD VIEWPORT ───────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

        {/* ━━━ LEFT: CAMERA FEED CONTAINER ━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="bg-surface border border-white/10 rounded-[18px] overflow-hidden shadow-xl flex flex-col h-full">

            {/* Camera toolbar: REC | Snapshot | Expand | End Ride */}
            <div className="px-4 py-2.5 bg-surface-hover border-b border-border flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-safe/10 text-safe font-mono font-bold text-[10px] border border-safe/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" /> LIVE
                </span>
                <span className="text-[11px] font-mono text-text-muted hidden sm:inline">
                  CABIN CAM-01 · 1080P
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* REC Button */}
                <button
                  onClick={() => setIsRecording(r => !r)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border text-xs font-mono font-medium transition-colors ${
                    isRecording
                      ? 'bg-danger/10 text-danger border-danger/30'
                      : 'bg-card text-text-muted border-border'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-danger animate-pulse' : 'bg-text-muted'}`} />
                  {isRecording ? 'REC' : 'PAUSED'}
                </button>

                {/* Snapshot Button */}
                <button
                  onClick={handleSnapshot}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-card hover:bg-surface border border-border text-text-secondary hover:text-text-primary text-xs font-medium transition-colors"
                >
                  <Camera size={13} />
                  <span className="hidden sm:inline">Snapshot</span>
                </button>

                {/* Expand Button */}
                <button
                  onClick={() => setCameraFull(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-card hover:bg-surface border border-border text-text-secondary hover:text-text-primary text-xs font-medium transition-colors"
                >
                  <Maximize2 size={13} />
                  <span className="hidden sm:inline">Fullscreen</span>
                </button>

                {/* End Ride Button */}
                <button
                  onClick={() => setShowEndRideModal(true)}
                  className="bg-danger hover:bg-danger/90 text-white rounded-[6px] px-3 py-1 flex items-center gap-1 text-xs font-semibold shadow-xs transition-colors"
                  title="End current ride session"
                >
                  <StopCircle size={13} />
                  <span>End Ride</span>
                </button>
              </div>
            </div>

            {/* LIVE WEBCAM FEED COMPONENT */}
            <WebcamFeed
              isRecording={isRecording}
              onTelemetryUpdate={handleTelemetryUpdate}
              className="flex-1 min-h-[380px]"
            />

            {/* Status bar */}
            <div className="px-4 py-2 bg-surface-hover border-t border-border flex items-center justify-between text-[11px] font-mono text-text-muted">
              <div className="flex items-center gap-4">
                <span>SENSOR: <strong className="text-safe">CALIBRATED</strong></span>
                <span className="hidden sm:inline">DRIVER: <strong className="text-text-primary">{telemetry.faceDetected ? 'VERIFIED' : 'SEARCHING'}</strong></span>
              </div>
              <span>FLEET #4082 · CABIN ACTIVE</span>
            </div>

          </div>
        </div>

        {/* ━━━ RIGHT: TELEMETRY & EVENTS ━━━━━━━━━━━━━━━━━━━ */}
        <div className="w-full lg:w-80 flex flex-col gap-4 flex-shrink-0">
          
          {/* Safety Score Card */}
          <div className="bg-surface border border-white/10 rounded-[16px] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-text-muted uppercase tracking-wider">
                Driver Safety Score
              </span>
              <span className="text-[10px] font-mono font-bold text-safe bg-safe/10 px-1.5 py-0.2 rounded border border-safe/25">
                LIVE
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <CircularGauge value={telemetry.score} size={70} />
                <div className="absolute inset-0 flex items-center justify-center rotate-[90deg]">
                  <span className="text-base font-extrabold text-text-primary font-mono">{telemetry.score}</span>
                </div>
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary tracking-tight">
                  {telemetry.score >= 90 ? 'Optimal' : telemetry.score >= 80 ? 'Good' : 'Review Needed'}
                </p>
                <p className="text-xs text-text-muted mt-0.5">Safety index 98th percentile</p>
              </div>
            </div>
          </div>

          {/* Realtime AI Detection Metrics */}
          <div className="bg-surface border border-white/10 rounded-[16px] p-4 shadow-sm space-y-3">
            <h3 className="text-[11px] font-mono font-semibold text-text-muted uppercase tracking-wider border-b border-border pb-2">
              Cabin Telemetry Signals
            </h3>

            <div className="space-y-0.5">
              <StatusRow label="Driver Verification" ok={telemetry.faceDetected} note={telemetry.faceDetected ? 'VERIFIED' : 'SEARCHING'} />
              <StatusRow label="Forward Gaze" ok={telemetry.eyesOnRoad} note={telemetry.eyesOnRoad ? 'FOCUSED' : 'OFF-ROAD'} />
              <StatusRow label="Phone Disengagement" ok={!telemetry.phoneDetected} note={telemetry.phoneDetected ? 'IN USE' : 'CLEAR'} />
              <StatusRow label="Seat Belt Fastened" ok={telemetry.seatbeltOk} note={telemetry.seatbeltOk ? 'BUCKLED' : 'UNBUCKLED'} />
              <StatusRow label="Fatigue Index" ok={telemetry.drowsiness < 30} note={`${telemetry.drowsiness}%`} />
            </div>

            {/* Test alert trigger buttons */}
            <div className="pt-2 border-t border-border">
              <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">Simulate Safety Triggers</p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => triggerAlert('phone')}
                  className="px-2 py-1.5 rounded-[6px] bg-card hover:bg-surface border border-border text-[10px] font-medium text-text-primary flex flex-col items-center gap-1 transition-colors"
                >
                  <Smartphone size={12} className="text-danger" />
                  Phone
                </button>
                <button
                  onClick={() => triggerAlert('fatigue')}
                  className="px-2 py-1.5 rounded-[6px] bg-card hover:bg-surface border border-border text-[10px] font-medium text-text-primary flex flex-col items-center gap-1 transition-colors"
                >
                  <Eye size={12} className="text-warning" />
                  Fatigue
                </button>
                <button
                  onClick={() => triggerAlert('seatbelt')}
                  className="px-2 py-1.5 rounded-[6px] bg-card hover:bg-surface border border-border text-[10px] font-medium text-text-primary flex flex-col items-center gap-1 transition-colors"
                >
                  <ShieldAlert size={12} className="text-danger" />
                  Seatbelt
                </button>
              </div>
            </div>
          </div>

          {/* Recent Event Log */}
          <div className="bg-surface border border-white/10 rounded-[16px] p-4 shadow-sm space-y-3">
            <h3 className="text-[11px] font-mono font-semibold text-text-muted uppercase tracking-wider border-b border-border pb-2">
              Trip Events Log
            </h3>
            <div className="space-y-2">
              {EVENTS.map((ev, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ev.dot}`} />
                  <span className="font-mono text-text-muted text-[10px]">{ev.time}</span>
                  <span className={`font-medium ${ev.color} truncate`}>{ev.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ━━━ END RIDE CONFIRMATION MODAL ━━━ */}
      <AnimatePresence>
        {showEndRideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEndRideModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-surface border border-white/12 rounded-[18px] p-5 shadow-2xl z-10 space-y-4 text-text-primary"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-[10px] bg-danger/10 border border-danger/20 flex items-center justify-center text-danger flex-shrink-0">
                  <StopCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">End Current Trip Session?</h3>
                  <p className="text-[11px] text-text-muted">Telemetry session will finalize</p>
                </div>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                This will finalize real-time computer vision logging and generate your driving analytics report.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEndRideModal(false)}
                  className="px-3.5 py-1.5 rounded-[8px] border border-border bg-card hover:bg-surface text-text-secondary text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEndRide}
                  className="px-4 py-1.5 rounded-[8px] bg-danger text-white text-xs font-semibold shadow-xs hover:bg-danger/90 transition-colors flex items-center gap-1.5"
                >
                  <StopCircle size={13} />
                  <span>Confirm End Ride</span>
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
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            <div className="h-11 bg-[#070707] px-4 flex items-center justify-between text-white border-b border-white/10 flex-shrink-0">
              <span className="font-semibold text-xs font-mono">CABIN CAM-01 · FULLSCREEN STREAM</span>
              <button
                onClick={() => setCameraFull(false)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
              >
                <Minimize2 size={13} /> Close
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
