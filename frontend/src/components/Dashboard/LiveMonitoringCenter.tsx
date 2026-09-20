import { memo, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio,
  Camera,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Smartphone,
  ShieldAlert,
  Shield,
  Truck,
  User as UserIcon,
  StopCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import WebcamFeed from './WebcamFeed'

const FINAL_SESSION_STORAGE_KEY = 'driverguard.final_session_summary'

/* ─── Circular Safety Score Gauge ─────────────────────────── */

function CircularGauge({ value, size = 68 }: { value: number; size?: number }) {
  const radius = (size - 10) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (value / 100) * circ
  const color = value >= 90 ? '#10b981' : value >= 80 ? '#f59e0b' : '#f43f5e'
  return (
    <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-border" strokeWidth={6} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  )
}

const LiveMonitoringCenter = memo(function LiveMonitoringCenter() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  // Feed control states
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isRecording, setIsRecording] = useState(true)
  const [showEndRideModal, setShowEndRideModal] = useState(false)

  // Real-time telemetry state for live camera
  const [liveTelemetry, setLiveTelemetry] = useState({
    score: 0,
    eyesOnRoad: false,
    phoneDetected: false,
    seatbeltOk: false,
    drowsiness: 0,
    faceDetected: false,
    status: 'waiting',
    isDistracted: false,
    topClass: 'waiting_for_detection',
    className: 'Waiting for live YOLO result',
    confidence: 0,
    detections: [] as any[],
    alerts: [] as string[],
    cameraState: 'initializing' as 'initializing' | 'active' | 'denied' | 'not_detected' | 'error',
    processingState: 'idle' as 'idle' | 'processing' | 'success' | 'error',
    detectionState: 'waiting' as 'waiting' | 'no_object' | 'object_detected' | 'api_error' | 'camera_unavailable',
    latencyMs: null as number | null,
    lastSuccessfulFrameAt: null as number | null,
    processingError: null as string | null,
    sessionSummary: null as {
      current_safety_score: number
      lowest_session_score: number
      total_distraction_events: number
      phone_events: number
      bottle_events: number
      cup_events: number
      total_distracted_duration: number
      events: Array<{
        type: string
        start_time: number
        end_time: number
        duration: number
        max_confidence: number
        min_score: number
      }>
    } | null,
  })

  useEffect(() => {
    const backendUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')
    sessionStorage.removeItem(FINAL_SESSION_STORAGE_KEY)
    void fetch(`${backendUrl}/api/video/session/reset`, { method: 'POST' }).catch(() => undefined)
  }, [])

  const handleTelemetryUpdate = useCallback((newTelemetry: Partial<typeof liveTelemetry>) => {
    setLiveTelemetry(prev => ({ ...prev, ...newTelemetry }))
  }, [])

  const detectionStateLabel = {
    waiting: 'WAITING FOR FRAME',
    no_object: 'NO OBJECT DETECTED',
    object_detected: 'OBJECT DETECTED',
    api_error: 'API / INFERENCE ERROR',
    camera_unavailable: 'CAMERA UNAVAILABLE',
  }[liveTelemetry.detectionState]

  const activeDriver = {
    name: 'Camera Feed',
    vehicle: 'Live YOLO stream',
    status: liveTelemetry.detectionState === 'api_error' || liveTelemetry.detectionState === 'camera_unavailable'
      ? 'alert'
      : liveTelemetry.cameraState === 'active' ? 'online' : 'offline',
    events: [
      {
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        label: liveTelemetry.className,
        dot: liveTelemetry.isDistracted ? 'bg-rose-500' : 'bg-emerald-500',
      },
    ],
  }

  const handleSnapshot = () => {
    toast.success('Snapshot Captured', `Saved live camera frame from ${activeDriver.name} (${activeDriver.vehicle})`)
  }

  const sessionSummary = liveTelemetry.sessionSummary ?? {
    current_safety_score: liveTelemetry.score,
    lowest_session_score: liveTelemetry.score,
    total_distraction_events: 0,
    phone_events: 0,
    bottle_events: 0,
    cup_events: 0,
    total_distracted_duration: 0,
    events: [],
  }

  // End Ride Confirmation Action
  const handleConfirmEndRide = async () => {
    setShowEndRideModal(false)
    toast.success('Ride Ended Successfully', 'Redirecting to AI driving report...')
    const isBiz = user?.role === 'business' || user?.accountType === 'business'
    const targetSummary = isBiz ? '/business/ride-summary' : '/personal/ride-summary'
    let finalSessionSummary = sessionSummary

    try {
      const backendUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')
      const response = await fetch(`${backendUrl}/api/video/session/summary`)
      if (response.ok) {
        finalSessionSummary = await response.json()
      }
    } catch {
      // Keep the latest frame summary if the authoritative read is unavailable.
    }

    sessionStorage.setItem(FINAL_SESSION_STORAGE_KEY, JSON.stringify(finalSessionSummary))

    navigate(targetSummary, {
      state: {
        rideData: {
          driverName: activeDriver.name,
          vehicle: activeDriver.vehicle,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          startTime: '09:15 AM',
          endTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          duration: '1h 13m',
          distance: '48.2 km',
          avgSpeed: '52 km/h',
          score: finalSessionSummary.current_safety_score,
          sessionSummary: finalSessionSummary,
        }
      }
    })
  }

  return (
    <div className="w-full h-full max-h-full bg-background text-on-surface flex flex-col overflow-hidden transition-colors duration-300">
      
      {/* ── TOP HEADER STRIP ──────────────────────────────── */}
      <div className="px-4 py-2 bg-surface border-b border-border flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Radio size={18} className="animate-pulse text-emerald-500" />
          </div>
          <div>
            <h1 className="font-display text-base md:text-lg font-extrabold tracking-tight">
              Live AI Monitoring Center
            </h1>
            <p className="text-[11px] text-on-surface-variant">
              Active Stream: <span className="font-bold text-on-surface">{activeDriver.name}</span> ({activeDriver.vehicle})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold border ${
            liveTelemetry.processingState === 'error'
              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${liveTelemetry.processingState === 'error' ? 'bg-rose-500' : 'bg-emerald-500 pulse-dot'}`} />
            {liveTelemetry.latencyMs === null ? 'LATENCY: --' : `LATENCY: ${liveTelemetry.latencyMs}ms`}
          </span>
        </div>
      </div>

      {/* ── MAIN THREE-PANEL LAYOUT (overflow: hidden, flex-1) ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 min-h-0 overflow-hidden">

        {/* ━━━ 1. LEFT SIDEBAR: DRIVER LIST ━━━━━━━━━━━━━━━━━ */}
        <div className="w-full lg:w-72 bg-card border border-border rounded-2xl p-3 shadow-sm flex flex-col gap-2.5 flex-shrink-0 min-h-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border pb-2 flex-shrink-0">
            <span className="text-xs font-extrabold uppercase tracking-wider text-on-surface flex items-center gap-2">
              <UserIcon size={14} className="text-primary" /> Detection Feed
            </span>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
              LIVE
            </span>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3 text-xs text-on-surface-variant">
            <p className="font-bold text-on-surface">{activeDriver.name}</p>
            <p className="mt-1">{activeDriver.vehicle}</p>
            <p className={`mt-2 font-mono text-[10px] uppercase ${liveTelemetry.cameraState === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
              CAMERA: {liveTelemetry.cameraState.replace('_', ' ')}
            </p>
            <p className={`mt-1 font-mono text-[10px] uppercase ${liveTelemetry.processingState === 'error' ? 'text-rose-500' : 'text-on-surface-variant'}`}>
              {detectionStateLabel}
            </p>
            {liveTelemetry.processingError && (
              <p className="mt-2 text-[11px] text-rose-500">{liveTelemetry.processingError}</p>
            )}
          </div>
        </div>

        {/* ━━━ 2. CENTER: CAMERA PANEL (height: 100%, overflow: hidden) ━━━━━━━ */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 h-full overflow-hidden">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl flex flex-col h-full min-h-0">

            {/* Toolbar: REC | Snapshot | Expand | End Ride */}
            <div className="px-3 py-2 bg-surface border-b border-border flex items-center justify-between gap-2 overflow-visible flex-nowrap flex-shrink-0">
              <div className="flex items-center gap-2 flex-shrink min-w-0">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-[10px] flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" /> LIVE 1080P
                </span>
                <span className="text-xs font-mono text-on-surface font-semibold hidden sm:block truncate">
                  {activeDriver.vehicle} • {activeDriver.name}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-nowrap overflow-visible flex-shrink-0">
                {/* REC Button */}
                <button
                  onClick={() => setIsRecording(r => !r)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors flex-shrink-0 ${
                    isRecording
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      : 'bg-surface text-on-surface-variant border-border'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-gray-400'}`} />
                  {isRecording ? 'REC' : 'PAUSED'}
                </button>

                {/* Snapshot Button */}
                <button
                  onClick={handleSnapshot}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-card border border-border text-on-surface-variant hover:text-on-surface transition-colors text-xs font-medium flex-shrink-0"
                >
                  <Camera size={13} />
                  <span className="hidden sm:inline">Snapshot</span>
                </button>

                {/* Expand / Fullscreen Button */}
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity text-xs font-medium flex-shrink-0"
                >
                  <Maximize2 size={13} />
                  <span className="hidden sm:inline">Expand</span>
                </button>

                {/* STEP 7: END RIDE BUTTON (bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-1.5 flex-shrink-0 whitespace-nowrap z-50) */}
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

            {/* Camera Display (Live Webcam with OpenCV) */}
            <div className="relative bg-black flex-1 overflow-hidden group min-h-0 h-full w-full">
              <WebcamFeed
                isRecording={isRecording}
                onTelemetryUpdate={handleTelemetryUpdate}
                className="w-full h-full"
              />
            </div>

            {/* Bottom Status Strip */}
            <div className="px-3 py-1.5 bg-surface border-t border-border flex items-center justify-between text-[11px] text-on-surface-variant font-medium flex-shrink-0">
              <span>VEHICLE: <span className="font-bold text-on-surface">{activeDriver.vehicle}</span></span>
              <span>SAFETY SCORE: <span className="font-mono font-bold text-emerald-500">{liveTelemetry.status === 'waiting' ? '--' : `${liveTelemetry.score}/100`}</span></span>
            </div>
          </div>
        </div>

        {/* ━━━ 3. RIGHT PANEL: AI DETECTION & SAFETY SCORE ━━━━━━ */}
        <div className="w-full lg:w-72 bg-card border border-border rounded-2xl p-3 shadow-sm flex flex-col gap-3 flex-shrink-0 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border pb-2 flex-shrink-0">
            <span className="text-xs font-extrabold uppercase tracking-wider text-on-surface flex items-center gap-2">
              <Shield size={14} className="text-primary" /> AI Safety Panel
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
              activeDriver.status === 'online'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : activeDriver.status === 'alert'
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                : 'bg-surface text-on-surface-variant border-border'
            }`}>
              {activeDriver.status}
            </span>
          </div>

          {/* Safety Score Gauge */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface border border-border flex-shrink-0">
            <div className="relative flex-shrink-0">
              <CircularGauge value={liveTelemetry.score} size={68} />
              <div className="absolute inset-0 flex items-center justify-center rotate-[90deg]">
                <span className="text-xs font-extrabold text-on-surface font-mono">{liveTelemetry.status === 'waiting' ? '--' : `${liveTelemetry.score}%`}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Safety Score
              </span>
              <span className="text-base font-extrabold text-on-surface font-mono">
                {liveTelemetry.status === 'waiting' ? '--' : <>{liveTelemetry.score}<span className="text-xs text-primary font-medium">/100</span></>}
              </span>
              <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">
                {liveTelemetry.status === 'waiting' ? 'Waiting for live frame' : liveTelemetry.score >= 90 ? 'High Compliance' : 'Review Advised'}
              </p>
            </div>
          </div>

          {/* AI Detections List */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">YOLO11 Model</span>
              <span className="font-bold text-[11px] text-emerald-500 font-mono">Pretrained (detect)</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">YOLO Detection</span>
              <span className={`font-bold text-[11px] truncate max-w-[130px] ${liveTelemetry.isDistracted ? 'text-rose-500 font-extrabold' : 'text-emerald-500'}`}>
                {liveTelemetry.className}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Frame Processing</span>
              <span className={`font-bold text-[11px] ${liveTelemetry.processingState === 'error' ? 'text-rose-500' : liveTelemetry.processingState === 'processing' ? 'text-amber-500' : 'text-emerald-500'}`}>
                {liveTelemetry.processingState === 'processing' ? 'PROCESSING' : liveTelemetry.processingState === 'error' ? 'ERROR' : liveTelemetry.processingState === 'success' ? 'ACTIVE' : 'WAITING'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Last Successful Frame</span>
              <span className="font-bold text-[11px] text-primary font-mono">
                {liveTelemetry.lastSuccessfulFrameAt === null ? '--' : new Date(liveTelemetry.lastSuccessfulFrameAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">AI Confidence</span>
              <span className="font-bold text-[11px] text-primary font-mono">
                {liveTelemetry.status === 'waiting' ? '--' : `${Math.round(liveTelemetry.confidence * 100)}%`}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Seat Belt</span>
              <span className={`font-bold text-[11px] flex items-center gap-1 ${liveTelemetry.seatbeltOk ? 'text-emerald-500' : 'text-rose-500'}`}>
                {liveTelemetry.status === 'waiting' ? '--' : liveTelemetry.seatbeltOk ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
                {liveTelemetry.status === 'waiting' ? 'WAITING' : liveTelemetry.seatbeltOk ? 'COMPLIANT' : 'UNBUCKLED'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Phone Usage</span>
              <span className={`font-bold text-[11px] flex items-center gap-1 ${!liveTelemetry.phoneDetected ? 'text-emerald-500' : 'text-rose-500'}`}>
                {liveTelemetry.status === 'waiting' ? '--' : !liveTelemetry.phoneDetected ? <CheckCircle2 size={12} /> : <Smartphone size={12} />}
                {liveTelemetry.status === 'waiting' ? 'WAITING' : !liveTelemetry.phoneDetected ? 'NONE' : 'DETECTED'}
              </span>
            </div>

            <div className="py-1 border-b border-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant text-[11px]">Fatigue Risk</span>
                <span className="font-bold text-[11px] text-emerald-500">{liveTelemetry.status === 'waiting' ? '--' : `${liveTelemetry.drowsiness}%`}</span>
              </div>
              <div className="w-full h-1 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: liveTelemetry.status === 'waiting' ? '0%' : `${liveTelemetry.drowsiness}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Eyes on Road</span>
              <span className={`font-bold text-[11px] flex items-center gap-1 ${liveTelemetry.eyesOnRoad ? 'text-emerald-500' : 'text-rose-500'}`}>
                {liveTelemetry.status === 'waiting' ? '--' : liveTelemetry.eyesOnRoad ? <Eye size={12} /> : <AlertTriangle size={12} />}
                {liveTelemetry.status === 'waiting' ? 'WAITING' : liveTelemetry.eyesOnRoad ? 'FOCUSED' : 'DISTRACTED'}
              </span>
            </div>
          </div>


          {/* Current Vehicle Details */}
          <div className="mt-auto p-2.5 rounded-xl bg-surface border border-border space-y-0.5 text-xs flex-shrink-0">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
              Current Vehicle
            </span>
            <p className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
              <Truck size={13} className="text-primary" /> {activeDriver.vehicle}
            </p>
          </div>
        </div>

      </div>

      {/* ━━━ 4. BOTTOM: RECENT EVENTS TIMELINE ━━━━━━━━━━━━━━━ */}
      <div className="mx-3 mb-3 flex-shrink-0">
        <div className="bg-card border border-border rounded-2xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-on-surface flex items-center gap-2">
              <Radio size={14} className="text-primary" /> Recent Events ({activeDriver.name})
            </span>
            <span className="text-[10px] text-on-surface-variant">Real-time driver log</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-border">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${liveTelemetry.isDistracted ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-on-surface truncate">{liveTelemetry.className}</p>
                <span className="text-[10px] text-on-surface-variant font-mono">{liveTelemetry.status === 'waiting' ? '--' : `${Math.round(liveTelemetry.confidence * 100)}%`}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-border">
              <span className="w-2 h-2 rounded-full flex-shrink-0 bg-sky-500" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-on-surface truncate">Status</p>
                <span className="text-[10px] text-on-surface-variant font-mono">{liveTelemetry.status}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-border">
              <span className="w-2 h-2 rounded-full flex-shrink-0 bg-violet-500" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-on-surface truncate">Detections</p>
                <span className="text-[10px] text-on-surface-variant font-mono">{liveTelemetry.detections?.length ?? 0} objects</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ TASK 1: END RIDE CONFIRMATION MODAL ━━━ */}
      <AnimatePresence>
        {showEndRideModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEndRideModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Confirmation Dialog Box */}
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
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <StopCircle size={14} />
                  End Ride
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ FULLSCREEN MODAL ━━━ */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col"
          >
            <div className="h-12 bg-black/80 backdrop-blur-md px-4 flex items-center justify-between text-white border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Radio size={15} className="text-emerald-400 animate-pulse" />
                <span className="font-bold text-sm font-mono">
                  LIVE MONITORING • {activeDriver.name} ({activeDriver.vehicle})
                </span>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
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

export default LiveMonitoringCenter
