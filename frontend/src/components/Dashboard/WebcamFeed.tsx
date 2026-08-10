import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Radio, AlertTriangle, ShieldAlert, Camera, RefreshCw, Cpu } from 'lucide-react'

interface WebcamFeedProps {
  onTelemetryUpdate?: (telemetry: {
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
    alerts?: string[]
  }) => void
  isRecording?: boolean
  className?: string
}

export default function WebcamFeed({ onTelemetryUpdate, isRecording: _isRecording = true, className = '' }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isProcessingRef = useRef<boolean>(false)

  const [status, setStatus] = useState<'initializing' | 'active' | 'denied' | 'not_detected' | 'error'>('initializing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [processedFrame, setProcessedFrame] = useState<string | null>(null)
  const [faceDetected, setFaceDetected] = useState<boolean>(true)
  const [isDistracted, setIsDistracted] = useState<boolean>(false)
  const [yoloClass, setYoloClass] = useState<string>('Safe Driving')
  const [yoloConfidence, setYoloConfidence] = useState<number>(0.98)
  const [fps, setFps] = useState<number>(0)
  const lastFrameTimeRef = useRef<number>(Date.now())
  const lastVoiceAlertTimeRef = useRef<number>(0)

  // Initialize browser webcam
  const startCamera = useCallback(async () => {
    setStatus('initializing')
    setErrorMessage('')

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('error')
      setErrorMessage('Browser does not support camera access (getUserMedia missing).')
      return
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
    } catch (err: any) {
      console.error('Camera initialization error:', err)
      const errName = err.name || ''
      const errStr = err.message || err.toString()

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errStr.includes('denied')) {
        setStatus('denied')
        setErrorMessage('Camera permission was denied. Please grant camera access in browser site settings.')
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError' || errStr.includes('not found')) {
        setStatus('not_detected')
        setErrorMessage('Camera not detected. Please connect a webcam and try again.')
      } else {
        setStatus('error')
        setErrorMessage(errStr || 'Failed to initialize live camera stream.')
      }
    }
  }, [])

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
      isProcessingRef.current = false
    }
  }, [startCamera])

  // Process frames with YOLO11 / FastAPI backend
  useEffect(() => {
    if (status !== 'active') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      isProcessingRef.current = false
      return
    }

    if (isProcessingRef.current) return
    isProcessingRef.current = true

    const sendFrameToBackend = async () => {
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

      try {
        const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
        const response = await fetch(`${backendUrl}/api/video/process_frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frame: frameData }),
        })

        if (response.ok) {
          const resData = await response.json()

          if (resData.success && resData.processed_frame) {
            setProcessedFrame(resData.processed_frame)
            setFaceDetected(resData.face_detected !== false)
            setIsDistracted(resData.is_distracted === true)

            if (resData.class_name) setYoloClass(resData.class_name)
            if (resData.confidence !== undefined) setYoloConfidence(resData.confidence)

            // Update FPS
            const now = Date.now()
            const delta = (now - lastFrameTimeRef.current) / 1000
            if (delta > 0) setFps(Math.round(1 / delta))
            lastFrameTimeRef.current = now

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
                score: resData.score ?? (resData.is_distracted ? 65 : 98),
                eyesOnRoad: resData.eyes_on_road !== false,
                phoneDetected: resData.phone_detected === true,
                seatbeltOk: resData.seatbelt_ok !== false,
                drowsiness: resData.drowsiness ?? (resData.is_distracted ? 8 : 2),
                faceDetected: resData.face_detected !== false,
                status: resData.status ?? (resData.is_distracted ? 'distracted' : 'safe'),
                isDistracted: resData.is_distracted === true,
                topClass: resData.top_class ?? 'c0',
                className: resData.class_name ?? 'Safe Driving',
                confidence: resData.confidence ?? 0.98,
                alerts: resData.alerts ?? [],
              })
            }
          }
        }
      } catch {
        // Fallback: Display raw video if backend is loading
      }
    }

    intervalRef.current = window.setInterval(sendFrameToBackend, 150)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      isProcessingRef.current = false
    }
  }, [status, onTelemetryUpdate])

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

      {/* Top HUD status badge */}
      {status === 'active' && (
        <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white flex items-center gap-2 text-xs font-mono z-20 shadow-md">
          <Cpu size={14} className={isDistracted ? 'text-rose-500 animate-bounce' : 'text-emerald-400 animate-pulse'} />
          <span className="font-extrabold">{isDistracted ? 'YOLO11 AI: DISTRACTION WARNING' : 'YOLO11 AI CABIN GUARD'}</span>
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
