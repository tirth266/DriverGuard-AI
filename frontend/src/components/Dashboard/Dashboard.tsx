import { memo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  Maximize2,
  Minimize2,
  AlertOctagon,
  StopCircle,
  ShieldOff,
  Smartphone,
  Coffee,
  Utensils,
  User,
  ArrowLeftRight,
  ArrowDown,
  Eye,
  Smile,
  Ban,
  History,
  PhoneCall,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import WebcamFeed, { useScoreDisplay } from '../../components/dashboard/WebcamFeed'
import type { CabinCategory, Telemetry } from '../../components/dashboard/WebcamFeed'
import { fetchWithAuth, buildApiUrl } from '../../services/fleetApi'

/* ─── Alert metadata ─────────────────────────────────── */

const ALERT_LABELS: Record<string, string> = {
  phone_use: 'Phone use',
  phone_call_suspected: 'Phone call (suspected)',
  drinking_eating: 'Drinking / eating',
  eyes_closed: 'Eyes closed',
  drowsy: 'Drowsy',
  head_away: 'Head away',
  head_down: 'Head down',
  yawn: 'Yawning',
}

// Events inferred from landmarks have no detection behind them, so they are
// always labelled and always coloured amber rather than the red used for
// confirmed detections.
const INFERRED_ALERTS = new Set(['phone_call_suspected'])

const ALERT_ICONS: Record<string, typeof Smartphone> = {
  phone_use: Smartphone,
  phone_call_suspected: PhoneCall,
  drinking_eating: Coffee,
  eyes_closed: Eye,
  drowsy: Eye,
  head_away: ArrowLeftRight,
  head_down: ArrowDown,
  yawn: Smile,
}

const CATEGORY_ICONS: Record<CabinCategory, typeof Smartphone> = {
  phone: Smartphone,
  drink: Coffee,
  food: Utensils,
}

const CATEGORY_COLORS: Record<CabinCategory, string> = {
  phone: '#FF4D67',
  drink: '#38BDF8',
  food: '#FB923C',
}

const GRADE_COLORS: Record<string, { stroke: string; text: string; chip: string }> = {
  Excellent: { stroke: '#20D98B', text: 'text-safe', chip: 'bg-safe/10 text-safe border-safe/30' },
  Good: { stroke: '#A3E635', text: 'text-lime-400', chip: 'bg-lime-400/10 text-lime-400 border-lime-400/30' },
  Fair: { stroke: '#F5B942', text: 'text-warning', chip: 'bg-warning/10 text-warning border-warning/30' },
  Poor: { stroke: '#FB923C', text: 'text-orange-400', chip: 'bg-orange-400/10 text-orange-400 border-orange-400/30' },
  Critical: { stroke: '#FF4D67', text: 'text-danger', chip: 'bg-danger/10 text-danger border-danger/30' },
}

const AI_STATUS_COPY: Record<string, string> = {
  warming_up: 'Starting AI engine — no frame has been analysed yet.',
  backend_down: 'Detection service unreachable — the score is held, not verified.',
  no_face: 'No face detected — eyes, head pose and mouth cannot be assessed.',
  no_result: 'The model returned no cabin objects for this frame.',
}

const INITIAL_TELEMETRY: Partial<Telemetry> = {
  score: 0,
  scoreAvailable: false,
  grade: '',
  aiStatus: 'warming_up',
  failReasons: [],
  activeAlerts: [],
  faceDetected: false,
  isDistracted: false,
  alerts: [],
  detections: [],
  detectionCount: 0,
  yoloSkipped: false,
  cabinObjects: { phone: 0, drink: 0, food: 0 },
  ear: null,
  mar: null,
  yaw: null,
  pitch: null,
  eyeState: 'no_face',
  eyesClosed: false,
  drowsy: false,
  yawning: false,
  headPose: 'no_face',
  phoneCallSuspected: false,
  phoneCallDuration: 0,
  cameraState: 'initializing',
  processingState: 'idle',
  detectionState: 'waiting',
  frameFreshness: 'stale',
  latencyMs: null,
  serverLatencyMs: null,
  fps: 0,
  lastSuccessfulFrameAt: null,
  processingError: null,
  sessionSummary: null,
}

/* ─── Safety score gauge ─────────────────────────────────── */

function CircularGauge({ value, grade, muted = false, size = 96 }: { value: number | null; grade: string | null; muted?: boolean; size?: number }) {
  const radius = (size - 12) / 2
  const circ = 2 * Math.PI * radius
  const hasScore = value !== null
  const offset = circ - ((hasScore ? Math.max(0, Math.min(100, value)) : 0) / 100) * circ
  // No score, or a score this frame could not verify: neutral gray, never green.
  const graded = hasScore && !muted
  const strokeColor = graded ? (GRADE_COLORS[grade ?? '']?.stroke || '#94A3B8') : 'transparent'
  const valueTone = graded ? (GRADE_COLORS[grade ?? '']?.text || 'text-text-secondary') : 'text-text-muted'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth={8}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-extrabold font-mono leading-none ${valueTone}`}>
          {hasScore ? value : '--'}
        </span>
        <span className="text-[9px] font-mono text-text-muted mt-0.5">/ 100</span>
      </div>
    </div>
  )
}

/* ─── Telemetry row helper ──────────────────────────────────── */

function SignalRow({
  label,
  value,
  tone = 'neutral',
  icon: Icon,
}: {
  label: string
  value: string
  tone?: 'good' | 'warn' | 'bad' | 'neutral' | 'muted'
  icon?: typeof User
}) {
  const toneClass =
    tone === 'good' ? 'text-safe'
      : tone === 'warn' ? 'text-warning'
      : tone === 'bad' ? 'text-danger'
      : tone === 'muted' ? 'text-text-muted'
      : 'text-text-primary'

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0 gap-3">
      <span className="text-[11px] text-text-secondary font-medium inline-flex items-center gap-1.5">
        {Icon ? <Icon size={12} className="text-text-muted" /> : null}
        {label}
      </span>
      <span className={`font-mono text-[11px] font-bold ${toneClass}`}>{value}</span>
    </div>
  )
}

/* ─── Main Dashboard ─────────────────────────────────────── */

export default memo(function Dashboard() {
  const [cameraFull, setCameraFull] = useState(false)
  const [isRecording, setIsRecording] = useState(true)
  const [showEndRideModal, setShowEndRideModal] = useState(false)

  // Real-time telemetry state updated by the live YOLO11 / MediaPipe camera feed
  const [telemetry, setTelemetry] = useState<Partial<Telemetry>>(INITIAL_TELEMETRY)

  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const handleTelemetryUpdate = useCallback((newTelemetry: Partial<Telemetry>) => {
    setTelemetry(prev => ({ ...prev, ...newTelemetry }))
  }, [])

  const handleSnapshot = () => toast.success('Snapshot Saved', 'Live webcam frame saved to incident log.')

  const aiStatus = telemetry.aiStatus || 'warming_up'
  const hasSignal = aiStatus === 'ok'
  // One source of truth for the score, the grade and every label derived from them.
  const scoreDisplay = useScoreDisplay(telemetry)
  const cabinObjects = telemetry.cabinObjects || { phone: 0, drink: 0, food: 0 }
  const activeAlerts = telemetry.activeAlerts || []
  const suspectedAlerts = activeAlerts.filter(alert => INFERRED_ALERTS.has(alert))
  const confirmedAlerts = activeAlerts.filter(alert => !INFERRED_ALERTS.has(alert))
  const breakdown = telemetry.sessionSummary?.score_breakdown || []
  const topPenalties = breakdown.slice(0, 2)
  const recentEvents = (telemetry.sessionSummary?.events || []).slice(0, 5)

  // One source of truth for the live state chip: SAFE and DISTRACTED can never show together.
  const stateChip = !hasSignal
    ? aiStatus === 'warming_up'
      ? { label: 'STARTING', className: 'bg-text-muted/10 text-text-muted border-text-muted/30' }
      : { label: 'NO AI SIGNAL', className: 'bg-text-muted/10 text-text-muted border-text-muted/30' }
    : telemetry.isDistracted
    ? { label: 'DISTRACTED', className: 'bg-danger/10 text-danger border-danger/30' }
    : { label: 'FOCUSED', className: 'bg-safe/10 text-safe border-safe/30' }

  // End Ride Action
  const handleConfirmEndRide = async () => {
    setShowEndRideModal(false)
    const isBiz = user?.role === 'business' || user?.accountType === 'business'
    const targetSummary = isBiz ? '/business/ride-summary' : '/personal/ride-summary'
    let sessionSummary: unknown
    try {
      sessionSummary = await fetchWithAuth(buildApiUrl('/api/video/session/summary'))
    } catch {
      // The report can still open if the authoritative session read is unavailable.
    }
    navigate(targetSummary, { state: { sessionSummary } })
  }

  const formatEventTime = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const headPoseText = telemetry.headPose === 'away'
    ? 'AWAY'
    : telemetry.headPose === 'down'
    ? 'DOWN'
    : telemetry.headPose === 'forward'
    ? 'FORWARD'
    : 'NO DATA'

  const eyeText = telemetry.eyeState === 'eyes_closed'
    ? 'CLOSED'
    : telemetry.eyeState === 'eyes_open'
    ? 'OPEN'
    : 'NO DATA'

  const mouthText = telemetry.yawning ? 'YAWNING' : telemetry.mar !== null ? 'NORMAL' : 'NO DATA'

  const chipBase = 'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border'

  return (
    <div className="w-full h-full flex-1 max-h-full overflow-y-auto bg-background flex flex-col p-4 md:p-6 text-text-primary">

      {/* ── PAGE HEADER ───────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-border">
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-extrabold tracking-tight">Live Cabin Monitoring</h1>
          <p className="text-[11px] text-text-muted mt-0.5">
            YOLO11 cabin objects + MediaPipe driver signals · {user?.name || 'Personal Driver'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`${chipBase} ${stateChip.className}`}>{stateChip.label}</span>
          <span className={`${chipBase} text-text-secondary border-border bg-card`}>
            {(telemetry.processingState || 'idle') === 'processing' ? 'PROCESSING' : (telemetry.processingState || 'idle').toUpperCase()}
          </span>
          <span className={`${chipBase} text-text-secondary border-border bg-card`}>
            {telemetry.serverLatencyMs === null || telemetry.serverLatencyMs === undefined
              ? 'SERVER --'
              : `SERVER ${Math.round(telemetry.serverLatencyMs)}ms`}
          </span>
          <span className={`${chipBase} text-text-secondary border-border bg-card`}>
            {telemetry.latencyMs === null || telemetry.latencyMs === undefined ? 'LATENCY --' : `LATENCY ${telemetry.latencyMs}ms`}
          </span>
          <span className={`${chipBase} text-text-secondary border-border bg-card`}>
            {telemetry.fps ? `${telemetry.fps} FPS` : 'FPS --'}
          </span>
          <span className={`${chipBase} text-text-secondary border-border bg-card`}>
            {telemetry.lastSuccessfulFrameAt
              ? `LAST SUCCESS ${new Date(telemetry.lastSuccessfulFrameAt).toLocaleTimeString()}`
              : 'LAST SUCCESS --'}
          </span>
        </div>
      </header>

      {/* ── ALERT BANNER ─────────────────────────────────────────── */}
      {confirmedAlerts.length > 0 && (
        <div className="mb-2 flex items-center gap-2 bg-danger text-white px-4 py-2.5 rounded-[12px] shadow-md text-xs font-semibold">
          <AlertOctagon size={16} className="flex-shrink-0" />
          <span>{confirmedAlerts.map(a => ALERT_LABELS[a] || a).join(' · ')}</span>
        </div>
      )}
      {suspectedAlerts.length > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-warning text-black px-4 py-2.5 rounded-[12px] shadow-md text-xs font-semibold">
          <PhoneCall size={16} className="flex-shrink-0" />
          <span>{suspectedAlerts.map(a => ALERT_LABELS[a] || a).join(' · ')} — inferred, no phone was detected</span>
        </div>
      )}

      {/* ── MAIN DASHBOARD VIEWPORT ───────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

        {/* ━━━ LEFT: CAMERA FEED ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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

                <button
                  onClick={handleSnapshot}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-card hover:bg-surface border border-border text-text-secondary hover:text-text-primary text-xs font-medium transition-colors"
                >
                  <Camera size={13} />
                  <span className="hidden sm:inline">Snapshot</span>
                </button>

                <button
                  onClick={() => setCameraFull(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-card hover:bg-surface border border-border text-text-secondary hover:text-text-primary text-xs font-medium transition-colors"
                >
                  <Maximize2 size={13} />
                  <span className="hidden sm:inline">Fullscreen</span>
                </button>

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

            <WebcamFeed
              isRecording={isRecording}
              onTelemetryUpdate={handleTelemetryUpdate}
              className="flex-1 min-h-[440px]"
            />

            {/* Status bar */}
            <div className="px-4 py-2 bg-surface-hover border-t border-border flex items-center justify-between text-[11px] font-mono text-text-muted">
              <div className="flex items-center gap-4">
                <span>SENSOR: <strong className="text-safe">CALIBRATED</strong></span>
                <span className="hidden sm:inline">
                  DRIVER: <strong className={telemetry.faceDetected ? 'text-safe' : 'text-text-muted'}>
                    {telemetry.faceDetected ? 'VERIFIED' : 'SEARCHING'}
                  </strong>
                </span>
              </div>
              <span>FLEET #4082 · CABIN ACTIVE</span>
            </div>

          </div>
        </div>

        {/* ━━━ RIGHT: TELEMETRY & EVENTS ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="w-full lg:w-96 flex flex-col gap-4 flex-shrink-0">

          {/* Safety Score Card */}
          <section className="bg-surface border border-white/10 rounded-[16px] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-text-muted uppercase tracking-wider">
                Driver Safety Score
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${stateChip.className}`}>
                {stateChip.label}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <CircularGauge value={scoreDisplay.score} grade={scoreDisplay.grade} muted={scoreDisplay.held} />
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className={`text-lg font-bold tracking-tight ${scoreDisplay.grade ? (GRADE_COLORS[scoreDisplay.grade]?.text || 'text-text-secondary') : 'text-text-muted'}`}>
                    {scoreDisplay.grade || 'Not assessed'}
                  </p>
                  {scoreDisplay.held && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border bg-text-muted/10 text-text-muted border-text-muted/30">
                      HELD
                    </span>
                  )}
                </div>
                {scoreDisplay.score === null ? (
                  <p className="text-[11px] text-text-muted leading-snug">{AI_STATUS_COPY[aiStatus]}</p>
                ) : scoreDisplay.held ? (
                  <p className="text-[11px] text-text-muted leading-snug">
                    Score held from the last analysed frame. {AI_STATUS_COPY[aiStatus]}
                  </p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[11px] text-text-muted">Top penalties</p>
                    {topPenalties.length === 0 ? (
                      <p className="text-[11px] text-text-secondary leading-snug">No penalties recorded this session.</p>
                    ) : (
                      topPenalties.map(item => (
                        <p key={item.type} className="text-[11px] text-text-secondary font-mono">
                          {ALERT_LABELS[item.type] || item.type} −{item.points_lost} ({item.count}×)
                        </p>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Telemetry panel */}
          <section className="bg-surface border border-white/10 rounded-[16px] p-4 shadow-sm space-y-2">
            <h3 className="text-[11px] font-mono font-semibold text-text-muted uppercase tracking-wider border-b border-border pb-2">
              Telemetry Signals
            </h3>

            {hasSignal ? (
              <>
                <SignalRow label="Driver Verification" value="VERIFIED" tone="good" icon={User} />
                <SignalRow
                  label="Eyes (EAR)"
                  value={telemetry.ear !== null && telemetry.ear !== undefined ? `${telemetry.ear.toFixed(3)} · ${eyeText}` : 'NO DATA'}
                  tone={telemetry.eyesClosed || telemetry.drowsy ? 'bad' : 'good'}
                  icon={Eye}
                />
                <SignalRow
                  label="Head Pose (yaw/pitch)"
                  value={telemetry.yaw !== null && telemetry.yaw !== undefined
                    ? `${telemetry.yaw.toFixed(1)}° / ${telemetry.pitch?.toFixed(1) ?? '--'}° · ${headPoseText}`
                    : 'NO DATA'}
                  tone={telemetry.headPose === 'away' || telemetry.headPose === 'down' ? 'warn' : 'good'}
                  icon={ArrowLeftRight}
                />
                <SignalRow
                  label="Mouth (MAR)"
                  value={telemetry.mar !== null && telemetry.mar !== undefined ? `${telemetry.mar.toFixed(3)} · ${mouthText}` : 'NO DATA'}
                  tone={telemetry.yawning ? 'warn' : 'good'}
                  icon={Smile}
                />
              </>
            ) : (
              <>
                <div className="flex items-start gap-2 rounded-[10px] border border-border bg-card px-3 py-2.5">
                  <ShieldOff size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-text-secondary">No AI signal</p>
                    <p className="text-[11px] text-text-muted leading-snug mt-0.5">{AI_STATUS_COPY[aiStatus]}</p>
                  </div>
                </div>
                <SignalRow label="Driver Verification" value="NO DATA" tone="muted" icon={User} />
                <SignalRow label="Eyes (EAR)" value="NO DATA" tone="muted" icon={Eye} />
                <SignalRow label="Head Pose" value="NO DATA" tone="muted" icon={ArrowLeftRight} />
                <SignalRow label="Mouth (MAR)" value="NO DATA" tone="muted" icon={Smile} />
              </>
            )}

            <div className="pt-2 border-t border-border">
              <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1.5">Cabin Objects</p>
              {hasSignal ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(CATEGORY_ICONS) as CabinCategory[]).map(key => {
                      const Icon = CATEGORY_ICONS[key]
                      return (
                        <div key={key} className="rounded-[8px] border border-border bg-card px-2 py-1.5 text-center">
                          <Icon size={13} className="mx-auto" style={{ color: CATEGORY_COLORS[key] }} />
                          <p className="text-sm font-extrabold font-mono mt-1">{cabinObjects[key] ?? 0}</p>
                          <p className="text-[9px] font-mono text-text-muted uppercase">{key}</p>
                        </div>
                      )
                    })}
                  </div>
                  {telemetry.yoloSkipped && (
                    <p className="text-[10px] text-text-muted font-mono mt-1.5">
                      Detection skipped this frame — holding the last tracked objects.
                    </p>
                  )}
                </>
              ) : (
                <p className="rounded-[8px] border border-border bg-card px-2.5 py-2 text-[11px] text-text-muted">
                  Counts unavailable while the AI signal is down.
                </p>
              )}
              {telemetry.phoneCallSuspected && (
                <p className="mt-1.5 text-[10px] font-mono text-warning inline-flex items-center gap-1">
                  <PhoneCall size={11} /> possible call, suspected ({(telemetry.phoneCallDuration ?? 0).toFixed(1)}s) — no phone detected
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-border space-y-0">
              <SignalRow label="Forward Gaze" value="NOT SUPPORTED" tone="muted" icon={Ban} />
              <SignalRow label="Seat Belt Fastened" value="NOT SUPPORTED" tone="muted" icon={Ban} />
              <SignalRow label="Fatigue Index" value="NOT SUPPORTED" tone="muted" icon={Ban} />
            </div>
          </section>

          {/* Live event feed */}
          <section className="bg-surface border border-white/10 rounded-[16px] p-4 shadow-sm space-y-2">
            <h3 className="text-[11px] font-mono font-semibold text-text-muted uppercase tracking-wider border-b border-border pb-2 inline-flex items-center gap-1.5">
              <History size={12} /> Live Event Feed
            </h3>
            {recentEvents.length === 0 ? (
              <p className="text-[11px] text-text-muted">No confirmed events recorded this session.</p>
            ) : (
              <ul className="space-y-1.5">
                {recentEvents.map((event, index) => {
                  const Icon = ALERT_ICONS[event.type] || AlertOctagon
                  const inferred = INFERRED_ALERTS.has(event.type)
                  return (
                    <li key={`${event.type}-${event.start_time}-${index}`} className="flex items-center justify-between gap-2 rounded-[8px] border border-border bg-card px-2.5 py-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-text-primary font-semibold min-w-0">
                        <Icon size={12} className={inferred ? 'text-warning flex-shrink-0' : 'text-danger flex-shrink-0'} />
                        <span className="truncate">
                          {ALERT_LABELS[event.type] || event.type}
                          {inferred && <span className="ml-1 text-[9px] font-mono text-warning">SUSPECTED</span>}
                        </span>
                      </span>
                      <span className="font-mono text-[10px] text-text-muted whitespace-nowrap">
                        {formatEventTime(event.start_time)} · {event.duration.toFixed(1)}s
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

        </div>

      </div>

      {/* ━━━ END RIDE CONFIRMATION MODAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
