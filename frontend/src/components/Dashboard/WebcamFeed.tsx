import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ShieldAlert,
  Camera,
  RefreshCw,
  Cpu,
  WifiOff,
  Activity,
  Volume2,
  VolumeX,
  EyeOff,
  ArrowLeftRight,
  ArrowDown,
  PhoneCall,
} from 'lucide-react'
import { fetchWithAuth, buildApiUrl } from '../../services/fleetApi'

type CameraState = 'initializing' | 'active' | 'denied' | 'not_detected' | 'error'
type ProcessingState = 'idle' | 'processing' | 'success' | 'error'
type DetectionState = 'waiting' | 'no_object' | 'object_detected' | 'api_error' | 'camera_unavailable'
type FrameFreshness = 'live' | 'processing' | 'stale' | 'backend_unavailable' | 'camera_disconnected'
type AiStatus = 'ok' | 'backend_down' | 'no_face' | 'no_result' | 'warming_up'
export type CabinCategory = 'phone' | 'drink' | 'food'
type HeadPose = 'forward' | 'away' | 'down' | 'no_face'

export type EyePoint = { x: number; y: number }

export type Detection = {
  track_id: string
  class_name: string
  category: string
  confidence: number
  occluded: boolean
  bbox: { x1: number; y1: number; x2: number; y2: number }
}

export type SessionEvent = {
  type: string
  source: string
  start_time: number
  end_time: number
  duration: number
  max_confidence: number | null
  min_measurement: number | null
  min_score: number
}

export type ScoreBreakdown = {
  type: string
  count: number
  total_seconds: number
  points_lost: number
}

export type SessionSummary = {
  duration_seconds: number
  final_score: number
  grade: string
  lowest_session_score: number
  points_lost: number
  score_breakdown: ScoreBreakdown[]
  total_events: number
  phone_events: number
  total_distracted_duration: number
  events: SessionEvent[]
  score_timeline: Array<{ offset_seconds: number; score: number }>
}

export type Telemetry = {
  score: number
  scoreAvailable: boolean
  grade: string
  aiStatus: AiStatus
  failReasons: string[]
  activeAlerts: string[]
  faceDetected: boolean
  isDistracted: boolean
  alerts: string[]
  detections: Detection[]
  detectionCount: number
  yoloSkipped: boolean
  cabinObjects: Record<CabinCategory, number>
  ear: number | null
  mar: number | null
  yaw: number | null
  pitch: number | null
  eyeState: 'eyes_open' | 'eyes_closed' | 'no_face'
  eyesClosed: boolean
  drowsy: boolean
  yawning: boolean
  headPose: HeadPose
  phoneCallSuspected: boolean
  phoneCallDuration: number
  cameraState: CameraState
  processingState: ProcessingState
  detectionState: DetectionState
  frameFreshness: FrameFreshness
  latencyMs: number | null
  serverLatencyMs: number | null
  fps: number
  lastSuccessfulFrameAt: number | null
  processingError: string | null
  sessionSummary: SessionSummary | null
}

const CATEGORY_COLORS: Record<string, string> = {
  phone: '#FF4D67',
  drink: '#38BDF8',
  food: '#FB923C',
  person: '#94A3B8',
}

const CATEGORY_LABELS: Array<{ key: CabinCategory; label: string }> = [
  { key: 'phone', label: 'Phone' },
  { key: 'drink', label: 'Drink' },
  { key: 'food', label: 'Food' },
]

const HEAD_POSE_LABELS: Record<string, { text: string; icon: typeof ArrowLeftRight }> = {
  away: { text: 'LOOKING AWAY', icon: ArrowLeftRight },
  down: { text: 'HEAD DOWN', icon: ArrowDown },
}

const BEEP_COOLDOWN_MS = 3000

const CAPTURE_MAX_WIDTH = 640
const CAPTURE_JPEG_QUALITY = 0.7

// Healthy cadence once a frame has been analysed.
const FRAME_INTERVAL_MS = 50
// How often the AI models are polled while they are still warming up.
const ENGINE_POLL_MS = 500
// Only after this long may the UI call the detection service unreachable.
const ENGINE_READY_TIMEOUT_MS = 60000
// Retry delays after a failed frame: 500ms, 1s, 2s, then capped at 5s.
const RETRY_BACKOFF_MS = [500, 1000, 2000, 5000]

const EMPTY_CABIN_OBJECTS: Record<CabinCategory, number> = { phone: 0, drink: 0, food: 0 }

export type ScoreDisplay = {
  /** Last verified score, or null when no score has ever been produced. */
  score: number | null
  /** Backend grade for that score, or null when there is no score. */
  grade: string | null
  /** The score exists but the current frame could not verify it. */
  held: boolean
}

/**
 * Single source of truth for every score display. A score only becomes real once
 * the backend has actually produced one; before that (warm-up, no signal, no
 * face) nothing may be shown as a score.
 */
export function useScoreDisplay(telemetry: Partial<Telemetry>): ScoreDisplay {
  const [everAvailable, setEverAvailable] = useState(false)
  const available = telemetry.scoreAvailable === true

  useEffect(() => {
    if (available) setEverAvailable(true)
  }, [available])

  return {
    score: everAvailable ? (telemetry.score ?? 0) : null,
    grade: everAvailable ? telemetry.grade || null : null,
    held: everAvailable && !available,
  }
}

interface WebcamFeedProps {
  onTelemetryUpdate?: (telemetry: Partial<Telemetry>) => void
  isRecording?: boolean
  className?: string
}

export default function WebcamFeed({ onTelemetryUpdate, isRecording: _isRecording = true, className = '' }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const requestInFlightRef = useRef<boolean>(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const lastBeepAtRef = useRef(0)
  const frameFreshnessRef = useRef<FrameFreshness>('stale')

  const [status, setStatus] = useState<CameraState>('initializing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [processingState, setProcessingState] = useState<ProcessingState>('idle')
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [serverLatencyMs, setServerLatencyMs] = useState<number | null>(null)
  const [lastSuccessfulFrameAt, setLastSuccessfulFrameAt] = useState<number | null>(null)
  const [fps, setFps] = useState<number>(0)
  const [muted, setMuted] = useState(false)
  const [isDistracted, setIsDistracted] = useState(false)
  const [cabinObjects, setCabinObjects] = useState<Record<CabinCategory, number>>(EMPTY_CABIN_OBJECTS)
  const [eyeAlert, setEyeAlert] = useState<{ text: string; minEar: number | null } | null>(null)
  const [headAlert, setHeadAlert] = useState<{ text: string; icon: typeof ArrowLeftRight } | null>(null)
  const [callAlert, setCallAlert] = useState(false)
  const [frameFreshness, setFrameFreshness] = useState<FrameFreshness>('stale')
  const [videoDims, setVideoDims] = useState<{ w: number; h: number } | null>(null)
  const lastFrameTimeRef = useRef<number>(Date.now())
  const lastSuccessTimeRef = useRef<number>(0)

  const publishObservability = useCallback((update: Partial<Telemetry>) => {
    if (update.frameFreshness) {
      frameFreshnessRef.current = update.frameFreshness
      setFrameFreshness(update.frameFreshness)
    }
    onTelemetryUpdate?.(update)
  }, [onTelemetryUpdate])

  // Short alert tone generated with the Web Audio API. Rate limited so a
  // sustained alert cannot turn into continuous beeping.
  const beep = useCallback(() => {
    if (muted) return
    const now = Date.now()
    if (now - lastBeepAtRef.current < BEEP_COOLDOWN_MS) return
    lastBeepAtRef.current = now
    try {
      if (!audioContextRef.current) {
        const Ctor = window.AudioContext
          || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctor) return
        audioContextRef.current = new Ctor()
      }
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') void ctx.resume()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'square'
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.2)
    } catch {
      // Audio is best-effort; a blocked context must not break monitoring.
    }
  }, [muted])

  // Clear every AI overlay so a failed frame can never leave stale detections on screen
  const clearOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  // Draw YOLO bounding boxes on overlay canvas, colour-coded by category.
  // Boxes come from the backend as pixels of the analysed frame, so they are
  // divided by that frame's size and scaled onto the overlay bitmap.
  const drawYoloBoxes = useCallback((boxes: Detection[], frameWidth: number, frameHeight: number) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!frameWidth || !frameHeight) return

    const scaleX = canvas.width / frameWidth
    const scaleY = canvas.height / frameHeight

    for (const det of boxes) {
      const bbox = det.bbox
      if (!bbox) continue

      const isPerson = det.category === 'person'
      const color = CATEGORY_COLORS[det.category] || '#94A3B8'
      const x = bbox.x1 * scaleX
      const y = bbox.y1 * scaleY
      const w = (bbox.x2 - bbox.x1) * scaleX
      const h = (bbox.y2 - bbox.y1) * scaleY

      ctx.strokeStyle = color
      ctx.lineWidth = isPerson ? 1 : 2
      // A dashed box means the object is tracked but hidden behind a hand.
      if (det.occluded) {
        ctx.setLineDash([5, 4])
      }
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])

      if (isPerson) continue

      const label = det.occluded
        ? `${det.class_name.toUpperCase()} (HIDDEN BY HAND)`
        : `${det.class_name.toUpperCase()} ${Math.round(det.confidence * 100)}%`
      ctx.font = '12px monospace'
      const textWidth = ctx.measureText(label).width
      ctx.fillStyle = color
      ctx.fillRect(x, Math.max(y - 20, 0), textWidth + 8, 20)

      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, x + 4, Math.max(y - 4, 14))
    }
  }, [])

  // Draw MediaPipe eye landmarks on overlay canvas.
  // Landmarks are normalized (0..1) against the analysed frame, and the overlay
  // bitmap has that frame's aspect ratio, so they map straight across.
  const drawEyeLandmarks = useCallback((eyeLandmarks: { left: EyePoint[]; right: EyePoint[] } | undefined, eyesClosed: boolean) => {
    const canvas = overlayCanvasRef.current
    if (!canvas || !eyeLandmarks) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const eyeColor = eyesClosed ? '#FF4D67' : '#20D98B'
    const width = canvas.width
    const height = canvas.height

    for (const [, points] of Object.entries(eyeLandmarks)) {
      if (!points || points.length === 0) continue

      ctx.fillStyle = eyeColor
      for (const p of points) {
        ctx.beginPath()
        ctx.arc(p.x * width, p.y * height, 3, 0, 2 * Math.PI)
        ctx.fill()
      }

      // Draw eye outline
      ctx.strokeStyle = eyeColor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(points[0].x * width, points[0].y * height)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * width, points[i].y * height)
      }
      ctx.closePath()
      ctx.stroke()
    }
  }, [])

  // Draw MediaPipe hand landmarks on overlay canvas (normalized coordinates)
  const drawHandLandmarks = useCallback((handLandmarks: Array<Array<{ x: number; y: number; z: number }>> | undefined) => {
    const canvas = overlayCanvasRef.current
    if (!canvas || !handLandmarks || handLandmarks.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // index
      [5, 9], [9, 10], [10, 11], [11, 12], // middle
      [9, 13], [13, 14], [14, 15], [15, 16], // ring
      [13, 17], [17, 18], [18, 19], [19, 20], // pinky
      [0, 5], [0, 17], [5, 9], [9, 13], [13, 17], // palm
    ]

    for (const hand of handLandmarks) {
      // Draw connections
      ctx.strokeStyle = '#00bfff'
      ctx.lineWidth = 2
      for (const [i, j] of connections) {
        if (hand[i] && hand[j]) {
          ctx.beginPath()
          ctx.moveTo(hand[i].x * width, hand[i].y * height)
          ctx.lineTo(hand[j].x * width, hand[j].y * height)
          ctx.stroke()
        }
      }

      // Draw points
      ctx.fillStyle = '#00bfff'
      for (const p of hand) {
        ctx.beginPath()
        ctx.arc(p.x * width, p.y * height, 4, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
  }, [])

  // Initialize browser webcam
  const startCamera = useCallback(async () => {
    setStatus('initializing')
    setErrorMessage('')
    setProcessingError(null)
    setProcessingState('idle')
    publishObservability({
      cameraState: 'initializing',
      processingState: 'idle',
      detectionState: 'waiting',
      processingError: null,
    })

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('error')
      setErrorMessage('Browser does not support camera access (getUserMedia missing).')
      setProcessingState('error')
      publishObservability({
        cameraState: 'error',
        processingState: 'error',
        detectionState: 'camera_unavailable',
        processingError: 'Camera access is not supported by this browser.',
      })
      return
    }

    // Release any previously held camera tracks before re-requesting.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = mediaStream

      mediaStream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          setStatus('error')
          setErrorMessage('The camera disconnected. Reconnect it and retry the live stream.')
          setProcessingState('error')
          publishObservability({
            cameraState: 'error',
            processingState: 'error',
            detectionState: 'camera_unavailable',
            processingError: 'The camera disconnected. Reconnect it and retry the live stream.',
          })
        })
      })

      if (videoRef.current) {
        if (videoRef.current.srcObject !== mediaStream) {
          videoRef.current.srcObject = mediaStream
        }
        try {
          await videoRef.current.play()
        } catch (playErr: any) {
          if (playErr.name !== 'AbortError') {
            console.warn('Video play error:', playErr)
          }
        }
      }

      setStatus('active')
      publishObservability({ cameraState: 'active', processingState: 'idle', detectionState: 'waiting' })
    } catch (err: any) {
      console.error('Camera initialization error:', err)
      const errName = err.name || ''
      const errStr = err.message || err.toString()

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errStr.includes('denied')) {
        setStatus('denied')
        setErrorMessage('Camera permission was denied. Please grant camera access in browser site settings.')
        setProcessingState('error')
        publishObservability({
          cameraState: 'denied',
          processingState: 'error',
          detectionState: 'camera_unavailable',
          processingError: 'Camera permission was denied. Please allow camera access and retry.',
        })
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError' || errStr.includes('not found')) {
        setStatus('not_detected')
        setErrorMessage('Camera not detected. Please connect a webcam and try again.')
        setProcessingState('error')
        publishObservability({
          cameraState: 'not_detected',
          processingState: 'error',
          detectionState: 'camera_unavailable',
          processingError: 'No camera was detected. Connect a webcam and retry.',
        })
      } else if (
        errName === 'NotReadableError' ||
        errName === 'TrackStartError' ||
        errStr.toLowerCase().includes('in use') ||
        errStr.toLowerCase().includes('device in use')
      ) {
        setStatus('error')
        setErrorMessage(
          'Camera is already in use by another application or browser tab. ' +
          'Please close other apps using the camera (e.g. Teams, Zoom, other tabs) and click Retry.'
        )
        setProcessingState('error')
        publishObservability({
          cameraState: 'error',
          processingState: 'error',
          detectionState: 'camera_unavailable',
          processingError: 'Camera is in use by another app. Close other camera apps and retry.',
        })
      } else {
        setStatus('error')
        setErrorMessage(errStr || 'Failed to initialize live camera stream.')
        setProcessingState('error')
        publishObservability({
          cameraState: 'error',
          processingState: 'error',
          detectionState: 'camera_unavailable',
          processingError: 'The camera could not be started. Retry the live stream.',
        })
      }
    }
  }, [publishObservability])

  // Start webcam on mount
  useEffect(() => {
    startCamera()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      requestInFlightRef.current = false
    }
  }, [startCamera])

  // Track the real camera dimensions. Frames are only sent once these are known,
  // and the video stage is sized from them so the overlay box always matches the
  // visible video exactly.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const syncDimensions = () => {
      const w = video.videoWidth
      const h = video.videoHeight
      if (w > 0 && h > 0) {
        setVideoDims(prev => (prev && prev.w === w && prev.h === h ? prev : { w, h }))
      }
    }

    syncDimensions()
    video.addEventListener('loadedmetadata', syncDimensions)
    video.addEventListener('resize', syncDimensions)
    return () => {
      video.removeEventListener('loadedmetadata', syncDimensions)
      video.removeEventListener('resize', syncDimensions)
    }
  }, [status])

  // Process frames with YOLO11 / FastAPI backend
  useEffect(() => {
    if (status !== 'active' || !videoDims) {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
        intervalRef.current = null
      }
      requestInFlightRef.current = false
      return
    }

    let stopped = false
    let isProcessing = false
    let frameId = 0
    let retryIndex = 0
    let nextDelayMs = FRAME_INTERVAL_MS

    const scheduleRetry = () => {
      nextDelayMs = RETRY_BACKOFF_MS[Math.min(retryIndex, RETRY_BACKOFF_MS.length - 1)]
      retryIndex += 1
    }

    // The models load on a background thread, so the first frames of a session
    // are expected to be refused. Poll readiness and stay in a neutral warm-up
    // state instead of telling the user the service is unreachable.
    const waitForEngine = async () => {
      const deadline = Date.now() + ENGINE_READY_TIMEOUT_MS
      publishObservability({
        cameraState: 'active',
        processingState: 'processing',
        detectionState: 'waiting',
        frameFreshness: 'processing',
        aiStatus: 'warming_up',
        activeAlerts: [],
        processingError: null,
      })

      while (!stopped && Date.now() < deadline) {
        try {
          const response = await fetch(buildApiUrl('/api/video/status'))
          const body = await response.json()
          if (body?.models_ready?.ready) return true
        } catch {
          // Server not accepting connections yet: still warming up.
        }
        await new Promise(resolve => window.setTimeout(resolve, ENGINE_POLL_MS))
      }
      return false
    }

    const sendFrameToBackend = async () => {
      if (isProcessing || stopped) return
      if (!videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current

      if (video.readyState < 2 || video.paused || video.ended) return

      // Capture at a capped width: the backend only needs enough pixels, and a
      // 640px JPEG is roughly a third of the payload of a 1280px one.
      const sourceW = videoDims.w
      const sourceH = videoDims.h
      const w = Math.min(sourceW, CAPTURE_MAX_WIDTH)
      const h = Math.round(sourceH * (w / sourceW))

      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(video, 0, 0, w, h)
      const frameData = canvas.toDataURL('image/jpeg', CAPTURE_JPEG_QUALITY)
      const requestStartedAt = performance.now()
      const currentFrameId = ++frameId
      isProcessing = true
      setProcessingState('processing')
      setProcessingError(null)
      publishObservability({
        cameraState: 'active',
        processingState: 'processing',
        detectionState: 'waiting',
        frameFreshness: 'processing',
        processingError: null,
      })

      let isAuthError = false

      try {
        const response = await fetchWithAuth(buildApiUrl('/api/video/process_frame'), {
          method: 'POST',
          body: JSON.stringify({ frame: frameData }),
        })

        // Ignore stale responses (if a newer frame was already sent)
        if (currentFrameId !== frameId) return

        const latency = Math.round(performance.now() - requestStartedAt)
        setLatencyMs(latency)

        const resData = response

        const now = Date.now()

        // Backend returns: { success, ai_status, frame_width, frame_height, score,
        // grade, active_alerts, yolo, mediapipe, session }
        if (!resData?.success || !resData.yolo) {
          const message = typeof resData?.message === 'string'
            ? resData.message
            : 'Live detection is temporarily unavailable. Please retry.'
          scheduleRetry()
          setProcessingState('error')
          setProcessingError(message)
          setIsDistracted(false)
          setCabinObjects(EMPTY_CABIN_OBJECTS)
          setEyeAlert(null)
          setHeadAlert(null)
          clearOverlay()
          publishObservability({
            cameraState: 'active',
            processingState: 'error',
            detectionState: 'api_error',
            frameFreshness: 'backend_unavailable',
            latencyMs: latency,
            aiStatus: 'backend_down',
            processingError: message,
            activeAlerts: [],
          })
          return
        }

        const yolo = resData.yolo
        const mediapipe = resData.mediapipe
        const session = resData.session
        const aiStatus = (resData.ai_status || 'ok') as AiStatus
        const activeAlerts: string[] = resData.active_alerts || []

        // A frame came back: restart the backoff schedule at the fast cadence
        retryIndex = 0
        nextDelayMs = FRAME_INTERVAL_MS
        lastSuccessTimeRef.current = now

        // Every coordinate in this response belongs to the analysed frame. Sizing
        // the overlay bitmap to exactly that frame is what keeps the boxes and the
        // landmarks registered with the visible video at any container size.
        const frameWidth = resData.frame_width > 0 ? resData.frame_width : w
        const frameHeight = resData.frame_height > 0 ? resData.frame_height : h
        const overlay = overlayCanvasRef.current
        if (overlay && (overlay.width !== frameWidth || overlay.height !== frameHeight)) {
          overlay.width = frameWidth
          overlay.height = frameHeight
        }

        // Update YOLO state. A skipped frame still reports the tracks the backend
        // is holding, so the overlay and counts are refreshed, never blanked.
        setIsDistracted(yolo.distractor_detected === true)
        const nextCabinObjects: Record<CabinCategory, number> = yolo.cabin_objects || EMPTY_CABIN_OBJECTS
        setCabinObjects(nextCabinObjects)
        drawYoloBoxes(yolo.detections || [], frameWidth, frameHeight)

        // Update MediaPipe state
        const eyesClosed = mediapipe?.eyes_closed_event === true
        const drowsy = mediapipe?.drowsiness_event === true
        const headPose: HeadPose = (mediapipe?.head_pose || 'no_face') as HeadPose
        const phoneCallSuspected = mediapipe?.phone_call_suspected === true

        if (mediapipe) {
          drawEyeLandmarks(mediapipe.eye_landmarks, eyesClosed || drowsy)

          if (mediapipe.hand_landmarks_available && mediapipe.hand_landmarks) {
            drawHandLandmarks(mediapipe.hand_landmarks)
          }
        }

        const eyeAlertActive = eyesClosed || drowsy
        setEyeAlert(eyeAlertActive
          ? { text: drowsy ? 'DROWSY - WAKE UP' : 'EYES CLOSED - WAKE UP', minEar: mediapipe?.min_ear ?? null }
          : null)
        setHeadAlert(headPose === 'away' || headPose === 'down'
          ? { text: HEAD_POSE_LABELS[headPose].text, icon: HEAD_POSE_LABELS[headPose].icon }
          : null)
        setCallAlert(phoneCallSuspected)
        if (eyeAlertActive) beep()

        const serverLatency = resData.timings_ms?.total ?? null
        setServerLatencyMs(serverLatency)

        // Update FPS
        const delta = (now - lastFrameTimeRef.current) / 1000
        const nextFps = delta > 0 ? Math.round(1 / delta) : 0
        setFps(nextFps)
        lastFrameTimeRef.current = now
        setProcessingState('success')
        setProcessingError(null)
        setLastSuccessfulFrameAt(now)

        publishObservability({
          cameraState: 'active',
          processingState: 'success',
          detectionState: (yolo.detections?.length ?? 0) > 0 ? 'object_detected' : 'no_object',
          frameFreshness: 'live',
          latencyMs: latency,
          serverLatencyMs: serverLatency,
          lastSuccessfulFrameAt: now,
          processingError: null,
        })

        onTelemetryUpdate?.({
          score: resData.score,
          scoreAvailable: resData.score_available === true,
          grade: resData.grade,
          aiStatus,
          failReasons: resData.fail_reasons || [],
          activeAlerts,
          faceDetected: mediapipe?.face_detected ?? false,
          isDistracted: yolo.distractor_detected === true,
          alerts: yolo.alerts || [],
          detections: yolo.detections || [],
          detectionCount: yolo.detection_count ?? 0,
          yoloSkipped: yolo.yolo_skipped === true,
          cabinObjects: nextCabinObjects,
          ear: mediapipe?.ear ?? null,
          mar: mediapipe?.mar ?? null,
          yaw: mediapipe?.yaw ?? null,
          pitch: mediapipe?.pitch ?? null,
          eyeState: mediapipe?.eye_state || 'no_face',
          eyesClosed,
          drowsy,
          yawning: mediapipe?.yawn_detected === true,
          headPose,
          phoneCallSuspected,
          phoneCallDuration: mediapipe?.phone_call_suspected_duration ?? 0,
          latencyMs: latency,
          serverLatencyMs: serverLatency,
          fps: nextFps,
          sessionSummary: session ?? null,
        })
      } catch (error) {
        // Ignore stale responses
        if (currentFrameId !== frameId) return

        const message = error instanceof Error && error.message
          ? error.message
          : 'Unable to reach live detection service. Check that the backend is running.'

        // Models still warming up: not a failure, keep the neutral warm-up state
        // and retry at the readiness poll rate. The refusal body is read
        // structurally so this stays independent of the API client's error type.
        const refused = error as { data?: { reason?: string } } | null
        if (refused?.data?.reason === 'warming_up') {
          nextDelayMs = ENGINE_POLL_MS
          publishObservability({
            cameraState: 'active',
            processingState: 'processing',
            frameFreshness: 'processing',
            aiStatus: 'warming_up',
            activeAlerts: [],
            processingError: null,
          })
          return
        }

        // Check for 401 Unauthorized - stop the retry loop on auth failure
        isAuthError = error instanceof Error && (error.message.includes('401') || error.message.includes('HTTP 401'))
        if (!isAuthError) scheduleRetry()
        setIsDistracted(false)
        setCabinObjects(EMPTY_CABIN_OBJECTS)
        setEyeAlert(null)
        setHeadAlert(null)
        clearOverlay()
        if (isAuthError) {
          setProcessingState('error')
          setProcessingError('Authentication failed. Please log in again.')
          publishObservability({
            cameraState: 'active',
            processingState: 'error',
            detectionState: 'api_error',
            frameFreshness: 'backend_unavailable',
            latencyMs: Math.round(performance.now() - requestStartedAt),
            aiStatus: 'backend_down',
            activeAlerts: [],
            processingError: 'Session expired. Please log in again.',
          })
          return
        }

        setProcessingState('error')
        setProcessingError(message)
        publishObservability({
          cameraState: 'active',
          processingState: 'error',
          detectionState: 'api_error',
          frameFreshness: 'backend_unavailable',
          latencyMs: Math.round(performance.now() - requestStartedAt),
          aiStatus: 'backend_down',
          activeAlerts: [],
          processingError: 'Unable to reach live detection service. Check that the backend is running.',
        })
      } finally {
        isProcessing = false
        // Schedule next frame (adaptive - only after current completes)
        // Don't schedule if there was an auth error
        if (!isAuthError && !stopped && status === 'active' && videoRef.current && !videoRef.current.paused) {
          intervalRef.current = window.setTimeout(sendFrameToBackend, nextDelayMs)
        }
      }
    }

    const start = async () => {
      const ready = await waitForEngine()
      if (stopped) return
      if (!ready) {
        // Only now, after the full readiness window, may this be called down.
        publishObservability({
          frameFreshness: 'backend_unavailable',
          aiStatus: 'backend_down',
          processingError: 'Detection models did not become ready. Check that the backend is running.',
        })
      }
      void sendFrameToBackend()
    }
    void start()

    // Stale frame detection - if no successful frame for 3 seconds, mark as stale
    const staleCheckInterval = window.setInterval(() => {
      if (lastSuccessTimeRef.current > 0 && Date.now() - lastSuccessTimeRef.current > 3000
        && (frameFreshnessRef.current === 'live' || frameFreshnessRef.current === 'processing')) {
        frameFreshnessRef.current = 'stale'
        setFrameFreshness('stale')
        publishObservability({ frameFreshness: 'stale' })
      }
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
        intervalRef.current = null
      }
      if (staleCheckInterval) {
        clearInterval(staleCheckInterval)
      }
      stopped = true
      isProcessing = false
    }
  }, [status, videoDims, onTelemetryUpdate, publishObservability, beep, clearOverlay, drawYoloBoxes, drawEyeLandmarks, drawHandLandmarks])

  const chipBase = 'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border backdrop-blur-md bg-black/60'

  return (
    <div className={`relative bg-black flex-1 overflow-hidden group min-h-[300px] flex items-center justify-center ${className}`}>
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Stage: the visible video box. Its height is capped by the layout and its
          width follows the camera aspect ratio, so nothing is cropped and the
          overlay (inset 0 of this same box) matches the video at any size. */}
      <div
        className="relative h-full max-h-full w-auto max-w-full"
        style={{ aspectRatio: videoDims ? `${videoDims.w} / ${videoDims.h}` : '16 / 9' }}
      >
        {/* HTML5 Live Video Element */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
            status === 'active' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Overlay canvas for bounding boxes and landmarks */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
        />
      </div>

      {/* ━━━ STATUS CHIPS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {status === 'active' && (
        <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center gap-1.5">
          <span className={`${chipBase} ${frameFreshness === 'live'
            ? 'text-safe border-safe/30'
            : 'text-danger border-danger/30'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${frameFreshness === 'live' ? 'bg-safe animate-pulse' : 'bg-danger'}`} />
            {frameFreshness === 'live' ? 'LIVE' : frameFreshness.toUpperCase()}
          </span>
          <span className={`${chipBase} ${processingState === 'success'
            ? 'text-safe border-safe/30'
            : processingState === 'processing'
            ? 'text-warning border-warning/30'
            : 'text-danger border-danger/30'}`}>
            <Cpu size={11} />
            {processingState === 'processing' ? 'PROCESSING' : processingState === 'error' ? 'PROCESSING ERROR' : 'READY'}
          </span>
          <span className={`${chipBase} text-text-secondary border-white/10`}>
            {serverLatencyMs === null ? 'SERVER --' : `SERVER ${Math.round(serverLatencyMs)}ms`}
          </span>
          <span className={`${chipBase} text-text-secondary border-white/10`}>
            {latencyMs === null ? 'LATENCY --' : `LATENCY ${latencyMs}ms`}
          </span>
          <span className={`${chipBase} text-text-secondary border-white/10`}>
            {fps > 0 ? `${fps} FPS` : 'FPS --'}
          </span>
          <span className={`${chipBase} text-text-secondary border-white/10`}>
            {lastSuccessfulFrameAt === null ? 'LAST SUCCESS --' : `LAST SUCCESS ${new Date(lastSuccessfulFrameAt).toLocaleTimeString()}`}
          </span>

          <span className="flex-1" />

          <button
            type="button"
            onClick={() => setMuted(m => !m)}
            className={`${chipBase} ${muted ? 'text-text-muted border-white/10' : 'text-warning border-warning/30'}`}
            title={muted ? 'Enable alert sound' : 'Mute alert sound'}
            aria-label={muted ? 'Enable alert sound' : 'Mute alert sound'}
          >
            {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
            {muted ? 'MUTED' : 'SOUND'}
          </button>
        </div>
      )}

      {/* ━━━ CABIN OBJECT COUNT CHIPS ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Counts are only meaningful on a live AI frame, never on stale data. */}
      {status === 'active' && frameFreshness === 'live' && (
        <div className="absolute top-11 left-3 z-20 flex flex-wrap items-center gap-1.5">
          {CATEGORY_LABELS.map(({ key, label }) => (
            <span
              key={key}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border bg-black/60 backdrop-blur-md"
              style={{ color: CATEGORY_COLORS[key], borderColor: `${CATEGORY_COLORS[key]}55` }}
            >
              {label.toUpperCase()} {cabinObjects[key] ?? 0}
            </span>
          ))}
        </div>
      )}

      {/* ━━━ CRITICAL EYE ALERT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {status === 'active' && eyeAlert && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-danger text-white font-extrabold px-5 py-3 rounded-2xl text-base flex items-center gap-2.5 shadow-2xl animate-pulse border-2 border-white/40">
          <EyeOff size={20} />
          <span className="tracking-wide">{eyeAlert.text}</span>
          {eyeAlert.minEar !== null && (
            <span className="text-[11px] font-mono font-bold opacity-90">MIN EAR {eyeAlert.minEar.toFixed(3)}</span>
          )}
        </div>
      )}

      {/* ━━━ HEAD POSE WARNING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {status === 'active' && headAlert && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-warning/95 text-black font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg border border-white/40">
          <headAlert.icon size={15} />
          {headAlert.text}
        </div>
      )}

      {/* ━━━ SUSPECTED PHONE CALL (inferred, amber) ━━━━━━━━━━━━━━━ */}
      {/* Amber, never red: no phone was detected, a hand is simply held at an ear. */}
      {status === 'active' && callAlert && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 z-30 bg-warning/95 text-black font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg border border-white/40">
          <PhoneCall size={15} />
          POSSIBLE PHONE CALL (SUSPECTED)
        </div>
      )}

      {/* AI Scanning laser overlay */}
      {status === 'active' && (
        <motion.div
          className={`absolute left-0 right-0 h-0.5 pointer-events-none z-20 ${
            isDistracted
              ? 'bg-gradient-to-r from-transparent via-danger/90 to-transparent'
              : 'bg-gradient-to-r from-transparent via-safe/70 to-transparent'
          }`}
          animate={{ top: ['3%', '94%', '3%'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {status === 'active' && processingState === 'error' && (
        <div className="absolute top-24 left-3 right-3 bg-rose-950/90 text-rose-100 px-3 py-2 rounded-xl border border-rose-400/40 text-xs z-30">
          {processingError || 'Live detection is temporarily unavailable. Please retry.'}
        </div>
      )}

      {/* Distraction badge */}
      {status === 'active' && isDistracted && (
        <div className="absolute bottom-14 left-3 bg-danger text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg z-20 border border-white/30">
          <ShieldAlert size={14} /> DISTRACTION CONFIRMED
        </div>
      )}

      {/* Backend unavailable banner */}
      {status === 'active' && frameFreshness === 'backend_unavailable' && (
        <div className="absolute bottom-14 left-3 right-3 bg-rose-950/90 text-rose-100 px-3 py-2 rounded-xl border border-rose-400/40 text-xs z-30 text-center">
          <WifiOff size={12} className="inline mr-1" /> Backend unavailable — showing raw camera feed
        </div>
      )}

      {/* Stale frame banner */}
      {status === 'active' && frameFreshness === 'stale' && (
        <div className="absolute bottom-14 left-3 right-3 bg-amber-950/90 text-amber-100 px-3 py-2 rounded-xl border border-amber-400/40 text-xs z-30 text-center">
          <Activity size={12} className="inline mr-1 animate-pulse" /> Frame stale — last AI result is outdated
        </div>
      )}

      {/* ━━━ ERROR / PERMISSION DENIED OVERLAYS ━━━ */}
      {status === 'initializing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white p-6 text-center z-30">
          <div className="w-10 h-10 rounded-full border-2 border-safe border-t-transparent animate-spin mb-3" />
          <p className="text-sm font-semibold">Initializing Browser Webcam...</p>
          <p className="text-xs text-gray-400 mt-1">Please allow camera permissions when prompted.</p>
        </div>
      )}

      {status === 'denied' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white p-6 text-center z-30">
          <div className="h-12 w-12 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center text-danger mb-3">
            <ShieldAlert size={26} />
          </div>
          <h3 className="text-base font-extrabold text-danger">Camera Access Denied</h3>
          <p className="text-xs text-gray-300 max-w-md mt-1 leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={startCamera}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-danger text-white font-bold text-xs hover:bg-danger/90 transition-all shadow-md"
          >
            <RefreshCw size={14} /> Retry Permission
          </button>
        </div>
      )}

      {status === 'not_detected' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white p-6 text-center z-30">
          <div className="h-12 w-12 rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-center text-warning mb-3">
            <AlertTriangle size={26} />
          </div>
          <h3 className="text-base font-extrabold text-warning">Camera Not Detected</h3>
          <p className="text-xs text-gray-300 max-w-md mt-1 leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={startCamera}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-warning text-black font-bold text-xs hover:opacity-90 transition-all shadow-md"
          >
            <RefreshCw size={14} /> Re-detect Camera
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white p-6 text-center z-30">
          <div className="h-12 w-12 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center text-danger mb-3">
            <Camera size={26} />
          </div>
          <h3 className="text-base font-extrabold text-danger">Camera Stream Error</h3>
          <p className="text-xs text-gray-300 max-w-md mt-1 leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={startCamera}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:opacity-90 transition-all shadow-md"
          >
            <RefreshCw size={14} /> Reload Stream
          </button>
        </div>
      )}
    </div>
  )
}
