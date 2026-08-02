import React, { useRef, useEffect, useState, useCallback } from 'react'
import { cn } from '@/utils/helpers'
import { useFullscreen } from '@/hooks/useCamera'
import { Button, IconButton } from './Button'
import { StatusBadge } from './Badge'
import { Card } from './Card'

interface CameraFeedProps {
  src: string | null
  isProcessing: boolean
  detections: any
  alerts: any[]
  fps: number
  isConnected: boolean
  isRecording: boolean
  onSnapshot: () => void
  onToggleRecording: () => void
  onToggleFullscreen: () => void
  onCameraSelect: (deviceId: string) => void
  cameras: { deviceId: string; label: string }[]
  selectedCamera: string | null
  mirror: boolean
  onMirrorToggle: () => void
  className?: string
}

export const CameraFeed = React.forwardRef<HTMLDivElement, CameraFeedProps>(
  ({
    src,
    isProcessing,
    detections,
    alerts,
    fps,
    isConnected,
    isRecording,
    onSnapshot,
    onToggleRecording,
    onToggleFullscreen,
    onCameraSelect,
    cameras,
    selectedCamera,
    mirror,
    onMirrorToggle,
    className,
    ...props
  }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef)
    const [showControls, setShowControls] = useState(false)
    const [currentAlert, setCurrentAlert] = useState<any>(null)

    useEffect(() => {
      if (alerts.length > 0) {
        const criticalAlert = alerts.find(a => a.severity === 'critical')
        const warningAlert = alerts.find(a => a.severity === 'warning')
        setCurrentAlert(criticalAlert || warningAlert || alerts[0])
      } else {
        setCurrentAlert(null)
      }
    }, [alerts])

    const handleVideoError = useCallback(() => {
      console.error('Video playback error')
    }, [])

    const handleLoadedData = useCallback(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(console.error)
      }
    }, [])

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative bg-dark-950 rounded-xl overflow-hidden border border-dark-700',
          'group',
          className
        )}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        {...props}
      >
        <div className="relative aspect-video w-full">
          {src ? (
            <img
              ref={videoRef}
              src={src}
              alt="Camera feed"
              className={cn(
                'w-full h-full object-cover transition-opacity duration-300',
                mirror && 'scale-x-[-1]'
              )}
              onError={handleVideoError}
              onLoad={handleLoadedData}
              style={{ opacity: isProcessing ? 1 : 0.5 }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-dark-500">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium">No camera feed</p>
              <p className="text-sm mt-1">Connect a camera to start monitoring</p>
            </div>
          )}

          {currentAlert && (
            <div className="absolute inset-0 flex items-end p-4 pointer-events-none animate-in">
              <div className={cn(
                'w-full max-w-md px-4 py-3 rounded-lg border shadow-lg animate-slide-up',
                currentAlert.severity === 'critical' 
                  ? 'bg-danger-500/90 border-danger-500 text-white' 
                  : 'bg-warning-500/90 border-warning-500 text-dark-950'
              )}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{currentAlert.severity === 'critical' ? '🚨' : '⚠️'}</span>
                  <p className="font-medium">{currentAlert.message}</p>
                </div>
              </div>
            </div>
          )}

          <div className={cn(
            'absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            showControls && 'opacity-100'
          )}>
            <div className="flex items-center gap-1.5 bg-dark-900/80 backdrop-blur-sm rounded-lg border border-dark-700 p-1.5">
              <StatusBadge 
                status={isConnected ? 'online' : 'offline'} 
                size="sm" 
                showText={false} 
              />
              <span className="text-xs text-dark-300 font-mono">{fps.toFixed(1)} FPS</span>
            </div>
            {isRecording && (
              <div className="flex items-center gap-1.5 bg-danger-500/20 border border-danger-500/30 rounded-lg px-3 py-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-danger-500" />
                <span className="text-xs font-medium text-danger-400">REC</span>
                <span className="text-xs text-dark-400 font-mono" id="recording-timer">00:00</span>
              </div>
            )}
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-3 bg-gradient-to-t from-dark-950/90 to-transparent pointer-events-none">
            <div className="flex items-center gap-3">
              {detections?.face_detected && (
                <>
                  <div className="flex items-center gap-1.5 bg-dark-900/80 backdrop-blur-sm rounded-lg border border-dark-700 px-3 py-1.5">
                    <span className="text-xs text-dark-400">EAR</span>
                    <span className="text-lg font-mono font-bold text-primary-400">{detections.ear_avg?.toFixed(3) || '0.000'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-dark-900/80 backdrop-blur-sm rounded-lg border border-dark-700 px-3 py-1.5">
                    <span className="text-xs text-dark-400">MAR</span>
                    <span className="text-lg font-mono font-bold text-warning-400">{detections.mar?.toFixed(3) || '0.000'}</span>
                  </div>
                </>
              )}
              {!detections?.face_detected && (
                <div className="flex items-center gap-2 bg-danger-500/20 border border-danger-500/30 rounded-lg px-3 py-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-danger-500" />
                  <span className="text-sm font-medium text-danger-400">No Face Detected</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {detections?.eyes_on_road !== undefined && (
                <div className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border',
                  detections.eyes_on_road 
                    ? 'bg-success-500/20 border-success-500/30 text-success-400' 
                    : 'bg-danger-500/20 border-danger-500/30 text-danger-400'
                )}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: detections.eyes_on_road ? '#22c55e' : '#ef4444' }} />
                  <span className="text-sm font-medium">{detections.eyes_on_road ? 'Eyes on Road' : 'Eyes Off Road'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-dark-950 to-transparent flex items-center justify-between gap-4 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-2">
            <select
              value={selectedCamera || ''}
              onChange={(e) => e.target.value && onCameraSelect(e.target.value)}
              className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Select camera"
            >
              <option value="">Select Camera</option>
              {cameras.map(cam => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label}
                </option>
              ))}
            </select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onMirrorToggle}
              className={cn('rounded-lg', mirror && 'bg-primary-500/20 text-primary-400')}
              aria-pressed={mirror}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Mirror</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onSnapshot}
              leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            >
              Snapshot
            </Button>
            
            <Button
              variant={isRecording ? 'danger' : 'secondary'}
              size="sm"
              onClick={onToggleRecording}
              leftIcon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>}
            >
              {isRecording ? 'Stop Recording' : 'Record'}
            </Button>

            <IconButton
              variant="ghost"
              size="md"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </IconButton>
          </div>
        </div>
      </div>
    )
  }
)

CameraFeed.displayName = 'CameraFeed'