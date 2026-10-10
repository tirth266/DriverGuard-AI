import { memo, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio,
  Camera,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Smartphone,
  Shield,
  Truck,
  User as UserIcon,
  StopCircle,
  MapPin,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  buildApiUrl,
  fetchWithAuth,
  rideApi,
} from '../../services/fleetApi'
import { startMonitoringRide } from '../../services/monitoringRide'
import WebcamFeed, { useScoreDisplay } from './WebcamFeed'
import type { Telemetry } from './WebcamFeed'
import { useGPS } from '../../hooks/useGPS'

const ALERT_LABELS: Record<string, string> = {
  phone_use: 'Phone use',
  drinking_eating: 'Drinking / eating',
  eyes_closed: 'Eyes closed',
  drowsy: 'Drowsy',
  head_away: 'Head away',
  head_down: 'Head down',
  yawn: 'Yawning',
}

/* â”€â”€â”€ Circular Safety Score Gauge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function CircularGauge({ value, muted = false, size = 68 }: { value: number; muted?: boolean; size?: number }) {
  const radius = (size - 10) / 2
  const circ = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circ - (clamped / 100) * circ
  // No verified score: neutral gray track only, never a green ring.
  const color = muted ? 'transparent' : value >= 90 ? '#10b981' : value >= 80 ? '#f59e0b' : '#f43f5e'
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

  // GPS Hook
  const { location: gpsLocation, error: gpsError, supported: gpsSupported, getCurrentLocation } = useGPS()

  // Feed control states
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showEndRideModal, setShowEndRideModal] = useState(false)

  // End Ride is a sequence, not a click: the feed is stopped, the ride is
  // finalized on the server and only then does the report open. These two hold
  // the ride across that sequence and keep it to a single run.
  const [endingRide, setEndingRide] = useState(false)
  // The camera feed, unmounted while the ride is being finalized so its frame loop
  // cannot keep scoring into a ride that is being closed.
  const [feedMounted, setFeedMounted] = useState(true)

  // The ride this monitoring session is driving. Monitoring begins when this view
  // mounts, so the ride begins here too: every frame is then sent with this id,
  // and the same id is the one End Ride closes.
  const [rideId, setRideId] = useState<number | null>(null)
  // Why no ride could be opened, when one could not. End Ride says this back
  // instead of a bare refusal, so a fleet with no driver or no vehicle reads as
  // the setup problem it is rather than a broken session.
  const [rideStartError, setRideStartError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const openRide = async () => {
      const userId = Number(user?.id)
      if (!userId) return
      try {
        const id = await startMonitoringRide(userId)
        if (!cancelled) {
          setRideId(id)
          setRideStartError(null)
        }
      } catch (error) {
        // Monitoring itself still works without a ride, so the session is not torn
        // down; the reason is kept so End Ride can report it instead of only
        // noticing that there is no ride to end.
        if (cancelled) return
        setRideId(null)
        setRideStartError(
          error instanceof Error
            ? error.message
            : 'The ride for this session could not be started, so there is no ride to report on.',
        )
      }
    }

    void openRide()
    return () => { cancelled = true }
  }, [user?.id])

  // Real-time telemetry state for live camera
  const [liveTelemetry, setLiveTelemetry] = useState<Partial<Telemetry>>({
    score: 0,
    scoreAvailable: false,
    sessionReset: false,

    aiStatus: 'warming_up',
    failReasons: [],
    activeAlerts: [],
    faceDetected: false,
    isDistracted: false,
    alerts: [],
    detections: [],
    detectionCount: 0,
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
    cameraState: 'initializing',
    processingState: 'idle',
    detectionState: 'waiting',
    frameFreshness: 'stale',
    latencyMs: null,
    fps: 0,
    lastSuccessfulFrameAt: null,
    processingError: null,
    sessionSummary: null,
  })

  const handleTelemetryUpdate = useCallback((newTelemetry: Partial<Telemetry>) => {
    setLiveTelemetry(prev => ({ ...prev, ...newTelemetry }))
  }, [])

  const hasSignal = liveTelemetry.aiStatus === 'ok'
  // One source of truth for the score and everything labelled from it. The score
  // advances whenever a frame was analysed with a visible driver; until then, and
  // whenever that stops, it is held rather than presented as a live reading.
  const scoreDisplay = useScoreDisplay(liveTelemetry)
  const verifiedScore = scoreDisplay.score
  const mutedScore = scoreDisplay.held
  const activeAlerts = liveTelemetry.activeAlerts ?? []
  const phoneAlert = activeAlerts.includes('phone_use')
  const detectionLabel = activeAlerts.length > 0
    ? activeAlerts.map(alert => ALERT_LABELS[alert] || alert).join(' Â· ')
    : hasSignal
    ? `${liveTelemetry.detectionCount ?? 0} cabin object(s)`
    : 'No AI signal'
  const topConfidence = liveTelemetry.detections?.length
    ? Math.max(...liveTelemetry.detections.map(detection => detection.confidence))
    : 0

  const detectionStateLabel = {
    waiting: 'WAITING FOR FRAME',
    no_object: 'NO OBJECT DETECTED',
    object_detected: 'OBJECT DETECTED',
    api_error: 'API / INFERENCE ERROR',
    camera_unavailable: 'CAMERA UNAVAILABLE',
  }[liveTelemetry.detectionState ?? 'waiting']

  const activeDriver = {
    name: 'Camera Feed',
    vehicle: 'Live YOLO stream',
    status: liveTelemetry.detectionState === 'api_error' || liveTelemetry.detectionState === 'camera_unavailable'
      ? 'alert'
      : liveTelemetry.cameraState === 'active' ? 'online' : 'offline',
    events: [
      {
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        label: detectionLabel,
        dot: liveTelemetry.isDistracted ? 'bg-rose-500' : 'bg-emerald-500',
      },
    ],
  }

  // Whether the camera is actually producing frames, read from the feed.
  const cameraActive = liveTelemetry.cameraState === 'active'

  // End Ride Confirmation Action
  const handleConfirmEndRide = async () => {
    // One finalize at a time. A second End Ride while the first is still talking
    // to the server would race it for the same ride's report.
    if (endingRide) return
    const endingRideId = rideId
    if (endingRideId === null) {
      // Nothing was ever recorded against a ride, so there is no ride to report
      // on. Showing a score here would mean inventing one out of the empty live
      // session, which is how a ride that never happened reads as a clean 100/100.
      // When the ride could not be opened because a driver or vehicle was
      // missing, that reason is given instead: it is what the user has to fix.
      toast.error(
        'Ride Not Started',
        rideStartError ?? 'No ride was recorded for this session, so there is no ride to report. Reload and start monitoring again.',
      )
      return
    }

    setEndingRide(true)
    setShowEndRideModal(false)

    const isBiz = user?.role === 'business' || user?.accountType === 'business'
    const targetSummary = isBiz ? '/business/ride-summary' : '/personal/ride-summary'

    // Stop the feed before anything else. Unmounting it stops the camera and the
    // frame loop, so no further frame is analysed into this ride while it is being
    // closed: a frame landing in that window could be scored after the report was
    // taken and then be silently missing from it.
    setFeedMounted(false)

    try {
      // Get GPS location for end location
      let endGpsLocation = gpsLocation
      if (!endGpsLocation && gpsSupported) {
        try {
          endGpsLocation = await getCurrentLocation()
        } catch {
          // GPS not available
        }
      }

      // Close the ride and finalize it. The server closes the events still open,
      // freezes this ride's session and stores its final score, grade, breakdown
      // and timeline on the ride itself, so the report outlives the session and a
      // reload reads back exactly this score.
      const { session_summary: finalSessionSummary } = await rideApi.end(endingRideId, { end_location: endGpsLocation })
      setRideId(null)

      // The ride is over, so its live session is discarded. Awaited, because that
      // reset is what clears the score the next ride must not inherit, and it must
      // not still be in flight once the report is on screen.
      await fetchWithAuth(buildApiUrl('/api/video/session/reset'), { method: 'POST' }).catch(() => undefined)

      toast.success('Ride Ended Successfully', 'Redirecting to AI driving report...')

      // The ride id travels in the URL, not only in router state: router state is
      // dropped by a reload and by a pasted link, and the report has to survive
      // both. The payload rides along as the fallback for the rare ride that
      // could not be persisted.
      navigate(`${targetSummary}?ride=${endingRideId}`, {
        state: { sessionSummary: finalSessionSummary ?? undefined, endGpsLocation },
      })
    } catch {
      // The ride was not closed, so it is not a completed ride and there is no
      // report to show. Stay here and let it be retried, rather than navigating to
      // a summary that would read as a finished ride with no score.
      setEndingRide(false)
      setFeedMounted(true)
      setShowEndRideModal(true)
      toast.error('Ride Not Closed', 'The ride could not be closed on the server, so there is no report to show. Try ending the ride again.')
    }
  }

  return (
    <div className="w-full h-full max-h-full bg-background text-on-surface flex flex-col overflow-hidden transition-colors duration-300">
      
      {/* â”€â”€ TOP HEADER STRIP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â”€â”€ MAIN THREE-PANEL LAYOUT (overflow: hidden, flex-1) â”€â”€ */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 min-h-0 overflow-hidden">

        {/* â”â”â” 1. LEFT SIDEBAR: DRIVER LIST â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */}
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
              CAMERA: {(liveTelemetry.cameraState ?? 'initializing').replace('_', ' ')}
            </p>
            <p className={`mt-1 font-mono text-[10px] uppercase ${liveTelemetry.processingState === 'error' ? 'text-rose-500' : 'text-on-surface-variant'}`}>
              {detectionStateLabel}
            </p>
            {liveTelemetry.aiStatus === 'warming_up' && liveTelemetry.engineProgress && (
              <p className="mt-1 font-mono text-[10px] text-primary">ENGINE: {liveTelemetry.engineProgress}</p>
            )}
            {liveTelemetry.processingError && (
              <p className="mt-2 text-[11px] text-rose-500">{liveTelemetry.processingError}</p>
            )}
          </div>
        </div>

        {/* â”â”â” 2. CENTER: CAMERA PANEL (height: 100%, overflow: hidden) â”â”â”â”â”â”â” */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 h-full overflow-hidden">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl flex flex-col h-full min-h-0">

            {/* Toolbar: camera state | REC | Snapshot | Expand | End Ride

                REC and Snapshot are disabled rather than wired to a stub. The frame
                loop runs for the whole ride regardless of the toggle, and no frame is
                ever written to disk, so an enabled control here would report an action
                the app does not perform. The badge reads the feed's real camera state. */}
            <div className="px-3 py-2 bg-surface border-b border-border flex items-center justify-between gap-2 overflow-visible flex-nowrap flex-shrink-0">
              <div className="flex items-center gap-2 flex-shrink min-w-0">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-[10px] flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-500 pulse-dot' : 'bg-amber-500'}`} />
                  CAMERA {cameraActive ? 'LIVE' : (liveTelemetry.cameraState ?? 'starting').replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-xs font-mono text-on-surface font-semibold hidden sm:block truncate">
                  {activeDriver.vehicle} â€¢ {activeDriver.name}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-nowrap overflow-visible flex-shrink-0">
                {/* REC: not implemented */}
                <button
                  disabled
                  title="Not available: the frame loop runs for the whole ride, so pausing capture is not implemented."
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-surface text-on-surface-variant text-xs font-semibold cursor-not-allowed opacity-60 flex-shrink-0"
                >
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  REC N/A
                </button>

                {/* Snapshot: not implemented */}
                <button
                  disabled
                  title="Not available: frames are analysed in memory and are not saved as images."
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-on-surface-variant text-xs font-medium cursor-not-allowed opacity-60 flex-shrink-0"
                >
                  <Camera size={13} />
                  <span className="hidden sm:inline">Snapshot N/A</span>
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
                  disabled={endingRide}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-1.5 flex-shrink-0 whitespace-nowrap z-50 flex items-center gap-1.5 text-xs font-bold shadow-md hover:shadow-red-600/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  title="End current ride session"
                >
                  <StopCircle size={14} />
                  <span>End Ride</span>
                </button>
              </div>
            </div>

            {/* Camera Display (Live Webcam with OpenCV)

                Fullscreen restyles THIS container and re-parents the header bar
                over it; it never mounts a second WebcamFeed. The one instance
                below therefore keeps its camera stream, frame loop and backend
                session across the transition instead of tearing down and
                re-acquiring all three. The two class strings are whole and
                mutually exclusive, so neither `relative`/`flex-1` nor
                `fixed` is ever present alongside its opposite. */}
            <div
              className={
                isFullscreen
                  ? 'fixed inset-0 z-[9999] bg-black overflow-hidden'
                  : 'relative bg-black flex-1 overflow-hidden group min-h-0 h-full w-full'
              }
            >
              {/* Unmounted while the ride is finalized, so its frame loop stops
                  before the ride is closed rather than racing the close. */}
              {feedMounted && (
                <WebcamFeed
                  onTelemetryUpdate={handleTelemetryUpdate}
                  rideId={rideId}
                  className="w-full h-full"
                />
              )}
            </div>

            {/* Bottom Status Strip */}
            <div className="px-3 py-1.5 bg-surface border-t border-border flex items-center justify-between text-[11px] text-on-surface-variant font-medium flex-shrink-0">
              <span>VEHICLE: <span className="font-bold text-on-surface">{activeDriver.vehicle}</span></span>
              <span>SAFETY SCORE: <span className="font-mono font-bold text-on-surface">{verifiedScore === null ? '--' : `${verifiedScore}/100`}</span></span>
            </div>
          </div>
        </div>

        {/* â”â”â” 3. RIGHT PANEL: AI DETECTION & SAFETY SCORE â”â”â”â”â”â” */}
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
              <CircularGauge value={verifiedScore ?? 0} muted={mutedScore} size={68} />
              <div className="absolute inset-0 flex items-center justify-center rotate-[90deg]">
                <span className="text-xs font-extrabold text-on-surface font-mono">{verifiedScore === null ? '--' : `${verifiedScore}%`}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Safety Score
              </span>
              <span className="text-base font-extrabold text-on-surface font-mono">
                {verifiedScore === null ? '--' : <>{verifiedScore}<span className="text-xs text-primary font-medium">/100</span></>}
              </span>
              <p className={`text-[10px] font-semibold mt-0.5 ${verifiedScore === null || mutedScore ? 'text-on-surface-variant' : 'text-emerald-500'}`}>
                {verifiedScore === null
                  ? 'Not assessed'
                  : mutedScore
                  ? 'Held — not verified'
                  : verifiedScore >= 90 ? 'High Compliance' : 'Review Advised'}
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
                {detectionLabel}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Frame Processing</span>
              <span className={`font-bold text-[11px] ${liveTelemetry.processingState === 'error' ? 'text-rose-500' : liveTelemetry.processingState === 'processing' ? 'text-amber-500' : 'text-emerald-500'}`}>
                {liveTelemetry.processingState === 'processing' ? 'PROCESSING' : liveTelemetry.processingState === 'error' ? 'ERROR' : liveTelemetry.processingState === 'success' ? 'ACTIVE' : 'WAITING'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">AI Confidence</span>
              <span className="font-bold text-[11px] text-primary font-mono">
                {hasSignal && topConfidence > 0 ? `${Math.round(topConfidence * 100)}%` : '--'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Seat Belt</span>
              <span className="font-bold text-[11px] text-on-surface-variant flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded border border-border flex items-center justify-center" />
                NOT SUPPORTED
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Phone Usage</span>
              <span className={`font-bold text-[11px] flex items-center gap-1 ${!phoneAlert ? 'text-emerald-500' : 'text-rose-500'}`}>
                {!hasSignal ? '--' : phoneAlert ? <Smartphone size={12} /> : <CheckCircle2 size={12} />}
                {!hasSignal ? 'NO SIGNAL' : phoneAlert ? 'DETECTED' : 'NONE'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Face Detection</span>
              <span className="font-bold text-[11px] text-emerald-500">
                {!hasSignal ? 'NO SIGNAL' : liveTelemetry.faceDetected ? 'DETECTED' : 'NO FACE'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Eye State</span>
              <span className={`font-bold text-[11px] ${liveTelemetry.drowsy ? 'text-rose-500' : 'text-emerald-500'}`}>
                {hasSignal ? liveTelemetry.eyeState : 'NO SIGNAL'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">EAR (Eye Aspect Ratio)</span>
              <span className="font-bold text-[11px] text-primary">
                {liveTelemetry.ear !== null && liveTelemetry.ear !== undefined
                  ? liveTelemetry.ear.toFixed(3)
                  : 'UNAVAILABLE'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Drowsiness Event</span>
              <span className={`font-bold text-[11px] ${liveTelemetry.drowsy ? 'text-rose-500' : 'text-emerald-500'}`}>
                {!hasSignal ? 'NO SIGNAL' : liveTelemetry.drowsy ? 'CONFIRMED' : 'NONE'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Yawning</span>
              <span className={`font-bold text-[11px] ${liveTelemetry.yawning ? 'text-rose-500' : 'text-emerald-500'}`}>
                {!hasSignal ? 'NO SIGNAL' : liveTelemetry.yawning ? 'CONFIRMED' : 'NONE'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">MAR (Mouth Aspect Ratio)</span>
              <span className="font-bold text-[11px] text-primary">
                {liveTelemetry.mar !== null && liveTelemetry.mar !== undefined
                  ? liveTelemetry.mar.toFixed(3)
                  : 'UNAVAILABLE'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Head Pose</span>
              <span className="font-bold text-[11px] text-primary">
                {hasSignal ? liveTelemetry.headPose : 'NO SIGNAL'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Cabin Objects</span>
              <span className="font-bold text-[11px] text-primary font-mono">
                {hasSignal
                  ? `phone ${liveTelemetry.cabinObjects?.phone ?? 0} Â· drink ${liveTelemetry.cabinObjects?.drink ?? 0} Â· food ${liveTelemetry.cabinObjects?.food ?? 0}`
                  : 'NO SIGNAL'}
              </span>
            </div>

            {activeAlerts.length > 0 && (
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-on-surface-variant text-[11px]">Active Alerts</span>
                <span className="font-bold text-[11px] text-rose-500">
                  {activeAlerts.join(', ')}
                </span>
              </div>
            )}
          </div>


          {/* GPS Location Display */}
          <div className="mt-2 p-2.5 rounded-xl bg-surface border border-border space-y-0.5 text-xs flex-shrink-0">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block flex items-center gap-1">
              <MapPin size={12} className="text-primary" /> GPS Location
            </span>
            {gpsLocation ? (
              <>
                <p className="font-mono text-xs text-on-surface">
                  {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                </p>
                <p className="text-[10px] text-on-surface-variant">
                  Accuracy: {gpsLocation.accuracy ? `${gpsLocation.accuracy.toFixed(1)}m` : 'Unknown'}
                </p>
              </>
            ) : gpsSupported ? (
              <p className="text-[10px] text-amber-500">Waiting for GPS fix...</p>
            ) : (
              <p className="text-[10px] text-rose-500">GPS not supported</p>
            )}
            {gpsError && <p className="text-[10px] text-rose-500">{gpsError}</p>}
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

      {/* â”â”â” 4. BOTTOM: RECENT EVENTS TIMELINE â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */}
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
                <p className="text-[11px] font-bold text-on-surface truncate">{detectionLabel}</p>
                <span className="text-[10px] text-on-surface-variant font-mono">{hasSignal && topConfidence > 0 ? `${Math.round(topConfidence * 100)}%` : '--'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-border">
              <span className="w-2 h-2 rounded-full flex-shrink-0 bg-sky-500" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-on-surface truncate">Status</p>
                <span className="text-[10px] text-on-surface-variant font-mono">{liveTelemetry.aiStatus}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-border">
              <span className="w-2 h-2 rounded-full flex-shrink-0 bg-violet-500" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-on-surface truncate">Detections</p>
                <span className="text-[10px] text-on-surface-variant font-mono">{hasSignal ? `${liveTelemetry.detectionCount ?? 0} objects` : '--'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* â”â”â” TASK 1: END RIDE CONFIRMATION MODAL â”â”â” */}
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
                This will stop monitoring, close the trip and open its report.
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
                  disabled={endingRide}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <StopCircle size={14} />
                  {endingRide ? 'Ending...' : 'End Ride'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* â”â”â” FULLSCREEN HEADER â”â”â”
          Header only. The camera itself is the container above, restyled to
          `fixed`, so entering fullscreen moves no feed and mounts no second
          one. It sits above that container (z-[10000] over z-[9999]) and is
          pointer-events-none apart from the exit button, so clicks fall
          through to the feed underneath. */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[10000] pointer-events-none"
          >
            <div className="h-12 bg-black/80 backdrop-blur-md px-4 flex items-center justify-between text-white border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Radio size={15} className="text-emerald-400 animate-pulse" />
                <span className="font-bold text-sm font-mono">
                  LIVE MONITORING â€¢ {activeDriver.name} ({activeDriver.vehicle})
                </span>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
              >
                <Minimize2 size={14} /> Exit Fullscreen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
})

export default LiveMonitoringCenter

