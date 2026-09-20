import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ShieldAlert, Camera, RefreshCw, Cpu } from 'lucide-react'

type CameraState = 'initializing' | 'active' | 'denied' | 'not_detected' | 'error'
type ProcessingState = 'idle' | 'processing' | 'success' | 'error'
type DetectionState = 'waiting' | 'no_object' | 'object_detected' | 'api_error' | 'camera_unavailable'

interface WebcamFeedProps {
  onTelemetryUpdate?: (telemetry: Partial<{
    score: number
    eyesOnRoad: boolean
    phoneDetected: boolean
    seatbeltOk: boolean
    drowsiness: number
    faceDetected: boolean
    status?: string
    isDistracted?: boolean
    topClass?: string
    className?: string
    confidence?: number
    detections?: any[]
    detectionCount?: number
    alerts?: string[]
    cameraState: CameraState
    processingState: ProcessingState
    detectionState: DetectionState
    latencyMs: number | null
    lastSuccessfulFrameAt: number | null
    processingError: string | null
    mediapipe: {
      available: boolean
      reason?: string
      face_detected: boolean
      eye_state: string
      eye_measurement: number | null
      drowsiness_event: boolean
      yawn_detected: boolean
      mouth_measurement: number | null
      head_pose: string
      hands_detected: boolean
      hand_count: number
      hand_landmarks_available: boolean
    } | null
    sessionSummary?: {
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
    } | null
  }>) => void
  isRecording?: boolean
  className?: string
}

export default function WebcamFeed({ onTelemetryUpdate, isRecording: _isRecording = true, className = '' }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const requestInFlightRef = useRef<boolean>(false)

  const [status, setStatus] = useState<CameraState>('initializing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [processingState, setProcessingState] = useState<ProcessingState>('idle')
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [lastSuccessfulFrameAt, setLastSuccessfulFrameAt] = useState<number | null>(null)
  const [processedFrame, setProcessedFrame] = useState<string | null>(null)
  const [_faceDetected, setFaceDetected] = useState<boolean>(true)
  const [isDistracted, setIsDistracted] = useState<boolean>(false)
  const [yoloClass, setYoloClass] = useState<string>('Waiting for live YOLO result')
  const [yoloConfidence, setYoloConfidence] = useState<number>(0)
  const [detections, setDetections] = useState<any[]>([])
  const [fps, setFps] = useState<number>(0)
  const lastFrameTimeRef = useRef<number>(Date.now())
  const lastVoiceAlertTimeRef = useRef<number>(0)

  const publishObservability = useCallback((update: Partial<{
    cameraState: CameraState
    processingState: ProcessingState
    detectionState: DetectionState
    latencyMs: number | null
    lastSuccessfulFrameAt: number | null
    processingError: string | null
  }>) => {
    onTelemetryUpdate?.(update)
  }, [onTelemetryUpdate])

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
    // This prevents NotReadableError on component remount or retry.
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
          processingError:
            'Camera is in use by another app. Close other camera apps and retry.',
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

  // Process frames with YOLO11 / FastAPI backend
  useEffect(() => {
    if (status !== 'active') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      requestInFlightRef.current = false
      return
    }

    const sendFrameToBackend = async () => {
      if (requestInFlightRef.current) return
      if (!videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current

      if (video.readyState < 2 || video.paused || video.ended) return

      const w = video.videoWidth || 640
      const h = video.videoHeight || 480

      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(video, 0, 0, w, h)
      const frameData = canvas.toDataURL('image/jpeg', 0.6)
      const requestStartedAt = performance.now()
      requestInFlightRef.current = true
      setProcessingState('processing')
      setProcessingError(null)
      publishObservability({
        cameraState: 'active',
        processingState: 'processing',
        detectionState: 'waiting',
        processingError: null,
      })

      try {
        const backendUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')
        const response = await fetch(`${backendUrl}/api/video/process_frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frame: frameData }),
        })

        const latency = Math.round(performance.now() - requestStartedAt)
        setLatencyMs(latency)

        let resData: any = null
        try {
          resData = await response.json()
        } catch {
          resData = null
        }

        if (!response.ok || !resData?.success || !resData.processed_frame) {
          const message = typeof resData?.message === 'string'
            ? resData.message
            : 'Live detection is temporarily unavailable. Please retry.'
          setProcessingState('error')
          setProcessingError(message)
          publishObservability({
            cameraState: 'active',
            processingState: 'error',
            detectionState: 'api_error',
            latencyMs: latency,
            processingError: message,
          })
          return
        }

        if (resData.success && resData.processed_frame) {
            setProcessedFrame(resData.processed_frame)
            setFaceDetected(resData.face_detected !== false)
            setIsDistracted(resData.is_distracted === true)

            const rawDets = resData.detections || []
            setDetections(rawDets)

            if (resData.class_name) setYoloClass(resData.class_name)
            if (resData.confidence !== undefined) setYoloConfidence(resData.confidence)

            // Update FPS
            const now = Date.now()
            const delta = (now - lastFrameTimeRef.current) / 1000
            if (delta > 0) setFps(Math.round(1 / delta))
            lastFrameTimeRef.current = now
            setProcessingState('success')
            setProcessingError(null)
            setLastSuccessfulFrameAt(now)
            publishObservability({
              cameraState: 'active',
              processingState: 'success',
              detectionState: rawDets.length > 0 ? 'object_detected' : 'no_object',
              latencyMs: latency,
              lastSuccessfulFrameAt: now,
              processingError: null,
            })

            // Voice Warning Audio Alert with 5s Cooldown
            if (resData.is_distracted && resData.alerts && resData.alerts.length > 0) {
              if (now - lastVoiceAlertTimeRef.current > 5000) {
                lastVoiceAlertTimeRef.current = now
                if ('speechSynthesis' in window) {
                  const utterance = new SpeechSynthesisUtterance(resData.alerts[0])
                  utterance.rate = 1.0
                  utterance.volume = 0.9
                  window.speechSynthesis.speak(utterance)
                }
              }
            }

            // Update parent telemetry
            if (onTelemetryUpdate) {
              onTelemetryUpdate({
                score: resData.score,
                eyesOnRoad: resData.eyes_on_road,
                phoneDetected: resData.phone_detected,
                seatbeltOk: resData.seatbelt_ok,
                drowsiness: resData.drowsiness,
                faceDetected: resData.face_detected,
                status: resData.status,
                isDistracted: resData.is_distracted,
                topClass: resData.top_class,
                className: resData.class_name,
                confidence: resData.confidence,
                detections: rawDets,
                detectionCount: rawDets.length,
                alerts: resData.alerts ?? [],
                mediapipe: resData.mediapipe ?? null,
                sessionSummary: resData.session_summary ?? null,
              })
            }
        }
      } catch (error) {
        const message = error instanceof Error && error.message
          ? error.message
          : 'Unable to reach live detection service. Check that the backend is running.'
        setProcessingState('error')
        setProcessingError(message)
        publishObservability({
          cameraState: 'active',
          processingState: 'error',
          detectionState: 'api_error',
          latencyMs: Math.round(performance.now() - requestStartedAt),
          processingError: 'Unable to reach live detection service. Check that the backend is running.',
        })
      } finally {
        requestInFlightRef.current = false
      }
    }

    intervalRef.current = window.setInterval(sendFrameToBackend, 150)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      requestInFlightRef.current = false
    }
  }, [status, onTelemetryUpdate, publishObservability])

  return (
    <div className={`relative bg-black flex-1 overflow-hidden group min-h-[300px] ${className}`}>
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* HTML5 Live Video Element */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          status === 'active' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
        }`}
      />

      {/* Processed YOLO11 AI overlay image */}
      {status === 'active' && processedFrame && (
        <img
          src={processedFrame}
          alt="YOLO11 AI Live Processed Stream"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        />
      )}

      {/* AI Scanning laser overlay */}
      {status === 'active' && (
        <motion.div
          className={`absolute left-0 right-0 h-0.5 pointer-events-none z-20 ${
            isDistracted
              ? 'bg-gradient-to-r from-transparent via-rose-500/90 to-transparent'
              : 'bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent'
          }`}
          animate={{ top: ['3%', '94%', '3%'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {status === 'active' && (
        <div className="absolute bottom-3 left-3 right-3 bg-black/75 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-white flex items-center justify-between gap-3 text-[10px] font-mono z-20">
          <span className={processingState === 'error' ? 'text-rose-400' : processingState === 'processing' ? 'text-amber-300' : 'text-emerald-400'}>
            {processingState === 'processing' ? 'PROCESSING FRAME' : processingState === 'error' ? 'PROCESSING ERROR' : 'PROCESSING ACTIVE'}
          </span>
          <span>{latencyMs === null ? 'LATENCY: --' : `LATENCY: ${latencyMs}ms`}</span>
          <span>{lastSuccessfulFrameAt === null ? 'LAST SUCCESS: --' : `LAST SUCCESS: ${new Date(lastSuccessfulFrameAt).toLocaleTimeString()}`}</span>
        </div>
      )}

      {status === 'active' && processingState === 'error' && (
        <div className="absolute top-14 left-3 right-3 bg-rose-950/90 text-rose-100 px-3 py-2 rounded-xl border border-rose-400/40 text-xs z-30">
          {processingError || 'Live detection is temporarily unavailable. Please retry.'}
        </div>
      )}

      {/* Top HUD status badge */}
      {status === 'active' && (
        <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white flex items-center gap-2 text-xs font-mono z-20 shadow-md">
          <Cpu size={14} className={isDistracted ? 'text-rose-500 animate-bounce' : 'text-emerald-400 animate-pulse'} />
          <span className="font-extrabold">
            {isDistracted ? 'YOLO11 AI: DISTRACTION DETECTED' : `YOLO11 DETECTION (${detections.length} OBJ)`}
          </span>
          {fps > 0 && <span className="text-[10px] text-emerald-400 font-bold">({fps} FPS)</span>}
        </div>
      )}

      {/* Alert badge if distraction detected */}
      {status === 'active' && isDistracted && (
        <div className="absolute top-3 right-3 bg-rose-600 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg z-20 animate-pulse border border-rose-400">
          <ShieldAlert size={14} /> {yoloClass.toUpperCase()} ({Math.round(yoloConfidence * 100)}%)
        </div>
      )}

      {/* ━━━ ERROR / PERMISSION DENIED OVERLAYS ━━━ */}
      {status === 'initializing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white p-6 text-center z-30">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-3" />
          <p className="text-sm font-semibold">Initializing Browser Webcam...</p>
          <p className="text-xs text-gray-400 mt-1">Please allow camera permissions when prompted.</p>
        </div>
      )}

      {status === 'denied' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white p-6 text-center z-30">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-3">
            <ShieldAlert size={26} />
          </div>
          <h3 className="text-base font-extrabold text-rose-400">Camera Access Denied</h3>
          <p className="text-xs text-gray-300 max-w-md mt-1 leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={startCamera}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-all shadow-md"
          >
            <RefreshCw size={14} /> Retry Permission
          </button>
        </div>
      )}

      {status === 'not_detected' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white p-6 text-center z-30">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-3">
            <AlertTriangle size={26} />
          </div>
          <h3 className="text-base font-extrabold text-amber-400">Camera Not Detected</h3>
          <p className="text-xs text-gray-300 max-w-md mt-1 leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={startCamera}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all shadow-md"
          >
            <RefreshCw size={14} /> Re-detect Camera
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white p-6 text-center z-30">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-3">
            <Camera size={26} />
          </div>
          <h3 className="text-base font-extrabold text-rose-400">Camera Stream Error</h3>
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
