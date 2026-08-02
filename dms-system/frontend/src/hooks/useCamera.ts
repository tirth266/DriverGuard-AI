import { useState, useEffect, useCallback, useRef } from 'react'
import { cameraService, CameraOptions, CameraDevice } from '@/services/camera'
import type { DetectionData, Alert } from '@/types'

export function useCamera(videoRef: React.RefObject<HTMLVideoElement>, options: CameraOptions = {}) {
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<CameraDevice | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<PermissionState>('prompt')
  const initializedRef = useRef(false)

  const initialize = useCallback(async () => {
    if (initializedRef.current || !videoRef.current) return
    
    try {
      setError(null)
      await cameraService.initialize(videoRef.current, options)
      const devices = await cameraService.enumerateDevices()
      setDevices(devices)
      
      if (devices.length > 0) {
        const device = devices[0]
        setSelectedDevice(device)
      }
      
      const permission = await cameraService.hasPermission()
      setPermissions(permission ? 'granted' : 'prompt')
      
      initializedRef.current = true
    } catch (err: any) {
      setError(err.message || 'Failed to initialize camera')
    }
  }, [videoRef, options])

  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      setError(null)
      await cameraService.startCamera(deviceId)
      setIsActive(true)
      const device = cameraService.getSelectedDevice()
      if (device) setSelectedDevice(device)
    } catch (err: any) {
      setError(err.message)
      setIsActive(false)
      throw err
    }
  }, [])

  const stopCamera = useCallback(() => {
    cameraService.stopCamera()
    setIsActive(false)
  }, [])

  const switchCamera = useCallback(async (deviceId: string) => {
    try {
      setError(null)
      await cameraService.switchCamera(deviceId)
      const device = cameraService.getSelectedDevice()
      if (device) setSelectedDevice(device)
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const takeSnapshot = useCallback(() => {
    return cameraService.takeSnapshot()
  }, [])

  useEffect(() => {
    initialize()
    
    return () => {
      cameraService.stopCamera()
      initializedRef.current = false
    }
  }, [initialize])

  return {
    devices,
    selectedDevice,
    isActive,
    error,
    permissions,
    initialize,
    startCamera,
    stopCamera,
    switchCamera,
    takeSnapshot,
    cameraService,
  }
}

export function useDetection() {
  const [detection, setDetection] = useState<DetectionData | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<{
    blink_counter: number
    yawn_counter: number
    drowsiness_counter: number
    eyes_closed_counter: number
    face_missing_counter: number
    eyes_off_road_counter: number
    current_fps: number
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastFrameTime, setLastFrameTime] = useState<number>(0)

  const processFrame = useCallback((frameData: string) => {
    setIsProcessing(true)
    setLastFrameTime(Date.now())
  }, [])

  const updateDetection = useCallback((data: DetectionData) => {
    setDetection(data)
    setStats({
      blink_counter: data.blink_counter,
      yawn_counter: data.yawn_counter,
      drowsiness_counter: data.drowsiness_counter || 0,
      eyes_closed_counter: data.eyes_closed_counter || 0,
      face_missing_counter: data.face_missing_counter || 0,
      eyes_off_road_counter: data.eyes_off_road_counter || 0,
      current_fps: data.fps,
    })
    
    if (data.alerts && data.alerts.length > 0) {
      setAlerts(prev => [...data.alerts, ...prev].slice(0, 50))
    }
    
    setIsProcessing(false)
  }, [])

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  const acknowledgeAlert = useCallback((alertId: number) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }, [])

  return {
    detection,
    alerts,
    stats,
    isProcessing,
    lastFrameTime,
    processFrame,
    updateDetection,
    clearAlerts,
    acknowledgeAlert,
  }
}

export function useMediaStream(constraints: MediaStreamConstraints = { video: true, audio: false }) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const start = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      return mediaStream
    } catch (err: any) {
      let message = 'Failed to access media devices'
      if (err.name === 'NotAllowedError') message = 'Permission denied'
      else if (err.name === 'NotFoundError') message = 'No device found'
      else if (err.name === 'NotReadableError') message = 'Device in use'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [constraints])

  const stop = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  useEffect(() => {
    return () => stop()
  }, [stop])

  return { stream, error, isLoading, start, stop }
}

export function useFullscreen(elementRef: React.RefObject<HTMLElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = useCallback(async () => {
    if (!elementRef.current) return

    try {
      if (!document.fullscreenElement) {
        await elementRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }, [elementRef])

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  return { isFullscreen, toggleFullscreen }
}