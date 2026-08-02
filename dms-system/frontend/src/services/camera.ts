import type { CameraDevice, DetectionResult } from '@/types'

export interface CameraOptions {
  width?: number
  height?: number
  fps?: number
  facingMode?: 'user' | 'environment'
  deviceId?: string
}

export interface CameraState {
  stream: MediaStream | null
  devices: CameraDevice[]
  selectedDevice: CameraDevice | null
  isActive: boolean
  error: string | null
  permissions: PermissionState
}

class CameraService {
  private stream: MediaStream | null = null
  private videoElement: HTMLVideoElement | null = null
  private canvasElement: HTMLCanvasElement | null = null
  private canvasContext: CanvasRenderingContext2D | null = null
  private animationFrameId: number | null = null
  private frameCallback: ((frameData: string) => void) | null = null
  private options: CameraOptions = {}
  private devices: CameraDevice[] = []
  private selectedDevice: CameraDevice | null = null
  private isCapturing = false
  private targetFps = 30
  private frameInterval = 0
  private lastFrameTime = 0

  async initialize(videoElement: HTMLVideoElement, options: CameraOptions = {}): Promise<void> {
    this.videoElement = videoElement
    this.options = {
      width: 1280,
      height: 720,
      fps: 30,
      facingMode: 'user',
      ...options
    }
    this.targetFps = this.options.fps || 30
    this.frameInterval = 1000 / this.targetFps
    
    this.canvasElement = document.createElement('canvas')
    this.canvasContext = this.canvasElement.getContext('2d', { willReadFrequently: true })
    
    await this.requestPermissions()
    await this.enumerateDevices()
  }

  async requestPermissions(): Promise<PermissionState> {
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
      return permission.state
    } catch {
      return 'prompt'
    }
  }

  async enumerateDevices(): Promise<CameraDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      this.devices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${this.devices.length + 1}`,
          kind: 'videoinput' as const
        }))
      return this.devices
    } catch (error) {
      console.error('Failed to enumerate devices:', error)
      return []
    }
  }

  getDevices(): CameraDevice[] {
    return this.devices
  }

  async startCamera(deviceId?: string): Promise<MediaStream> {
    if (this.stream) {
      this.stopCamera()
    }

    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: this.options.width },
        height: { ideal: this.options.height },
        frameRate: { ideal: this.options.fps },
        facingMode: deviceId ? undefined : this.options.facingMode
      },
      audio: false
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream
        this.videoElement.play()
      }

      const track = this.stream.getVideoTracks()[0]
      const settings = track.getSettings()
      
      if (deviceId) {
        this.selectedDevice = this.devices.find(d => d.deviceId === deviceId) || null
      } else if (!this.selectedDevice && this.devices.length > 0) {
        this.selectedDevice = this.devices[0]
      }

      return this.stream
    } catch (error: any) {
      let errorMessage = 'Failed to access camera'
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in browser settings.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.'
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support the requested resolution.'
      }
      
      throw new Error(errorMessage)
    }
  }

  stopCamera() {
    this.stopCapture()
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null
    }
    
    this.selectedDevice = null
  }

  switchCamera(deviceId: string): Promise<MediaStream> {
    return this.startCamera(deviceId)
  }

  startCapture(onFrame: (frameData: string) => void) {
    if (this.isCapturing || !this.videoElement || !this.canvasElement || !this.canvasContext) {
      return
    }

    this.frameCallback = onFrame
    this.isCapturing = true
    this.lastFrameTime = performance.now()
    this.captureLoop()
  }

  stopCapture() {
    this.isCapturing = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.frameCallback = null
  }

  private captureLoop = () => {
    if (!this.isCapturing || !this.videoElement || !this.canvasElement || !this.canvasContext || !this.frameCallback) {
      return
    }

    const now = performance.now()
    const elapsed = now - this.lastFrameTime

    if (elapsed >= this.frameInterval) {
      this.captureFrame()
      this.lastFrameTime = now - (elapsed % this.frameInterval)
    }

    this.animationFrameId = requestAnimationFrame(this.captureLoop)
  }

  private captureFrame() {
    if (!this.videoElement || !this.canvasElement || !this.canvasContext || !this.frameCallback) {
      return
    }

    const { videoWidth, videoHeight } = this.videoElement
    
    if (videoWidth === 0 || videoHeight === 0) {
      return
    }

    this.canvasElement.width = videoWidth
    this.canvasElement.height = videoHeight

    this.canvasContext.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight)

    const frameData = this.canvasElement.toDataURL('image/jpeg', 0.8)
    this.frameCallback(frameData)
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement
  }

  getStream(): MediaStream | null {
    return this.stream
  }

  getSelectedDevice(): CameraDevice | null {
    return this.selectedDevice
  }

  setTargetFps(fps: number) {
    this.targetFps = fps
    this.frameInterval = 1000 / fps
  }

  takeSnapshot(): string | null {
    if (!this.videoElement || !this.canvasElement || !this.canvasContext) {
      return null
    }

    const { videoWidth, videoHeight } = this.videoElement
    this.canvasElement.width = videoWidth
    this.canvasElement.height = videoHeight
    this.canvasContext.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight)
    
    return this.canvasElement.toDataURL('image/png')
  }

  getConstraints(): MediaTrackConstraints | null {
    if (!this.stream) return null
    const track = this.stream.getVideoTracks()[0]
    return track.getConstraints()
  }

  getSettings(): MediaTrackSettings | null {
    if (!this.stream) return null
    const track = this.stream.getVideoTracks()[0]
    return track.getSettings()
  }

  isCameraActive(): boolean {
    return this.stream !== null && this.stream.active
  }

  hasPermission(): Promise<boolean> {
    return navigator.permissions.query({ name: 'camera' as PermissionName })
      .then(permission => permission.state === 'granted')
      .catch(() => false)
  }
}

export const cameraService = new CameraService()