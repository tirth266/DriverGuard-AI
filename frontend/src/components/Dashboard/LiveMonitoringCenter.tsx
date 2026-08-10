import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio,
  Search,
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

/* ─── Mock Driver List with Individual Telemetry ───────────── */

interface FleetDriver {
  id: string
  name: string
  vehicle: string
  status: 'online' | 'offline' | 'alert'
  score: number
  drowsiness: number
  phoneDetected: boolean
  seatbeltOk: boolean
  smokingDetected: boolean
  eyesOnRoad: boolean
  handsOnWheel: boolean
  feedImage: string
  events: { time: string; label: string; dot: string }[]
}

const FLEET_DRIVERS: FleetDriver[] = [
  {
    id: 'DRV-101',
    name: 'John Driver',
    vehicle: 'Freightliner Cascadia #4082',
    status: 'online',
    score: 98,
    drowsiness: 2,
    phoneDetected: false,
    seatbeltOk: true,
    smokingDetected: false,
    eyesOnRoad: true,
    handsOnWheel: true,
    feedImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcKaLxmdIZwnR0lQmtyJqnulBLej0a0G8kFHVn1alPzu5Bih45tWBAph9k-Y_O-mDBiS96RZ6X6Pm6niij5B-CplXhXHUVFwTuaIm9ON1SnuBg7edeuTBmwyT-UrudvWqkJQYfwkRmLV4JkTFdmL0Za-_fIa5CC0_p2urfVKpFZ5yHicpcA_Xzpw1Baf5ENstaxctcRb9e5Ob1HFkQ9ZCUPonuqkQZT2f-2yawldUCYahojUrdLzzydNygLW_VYW37cVHmdtONPi4',
    events: [
      { time: '11:08 AM', label: 'Safe Driving Restored', dot: 'bg-emerald-500' },
      { time: '10:45 AM', label: 'Brief Eye Disengagement', dot: 'bg-amber-400' },
      { time: '10:12 AM', label: 'Shift Started', dot: 'bg-primary' },
    ],
  },
  {
    id: 'DRV-102',
    name: 'Marcus Vance',
    vehicle: 'Kenworth T680 #2014',
    status: 'alert',
    score: 74,
    drowsiness: 24,
    phoneDetected: true,
    seatbeltOk: true,
    smokingDetected: false,
    eyesOnRoad: false,
    handsOnWheel: false,
    feedImage: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80',
    events: [
      { time: '11:15 AM', label: 'Fatigue Warning Triggered', dot: 'bg-rose-500' },
      { time: '11:10 AM', label: 'Phone Usage Detected', dot: 'bg-rose-500' },
      { time: '10:30 AM', label: 'Rest Break Requested', dot: 'bg-amber-500' },
    ],
  },
  {
    id: 'DRV-103',
    name: 'Elena Rostova',
    vehicle: 'Volvo VNL 860 #1093',
    status: 'online',
    score: 95,
    drowsiness: 4,
    phoneDetected: false,
    seatbeltOk: true,
    smokingDetected: false,
    eyesOnRoad: true,
    handsOnWheel: true,
    feedImage: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80',
    events: [
      { time: '11:02 AM', label: 'Safe Driving Restored', dot: 'bg-emerald-500' },
      { time: '10:15 AM', label: 'Pre-Trip Inspection Verified', dot: 'bg-emerald-500' },
    ],
  },
  {
    id: 'DRV-104',
    name: 'David Miller',
    vehicle: 'Peterbilt 579 #3021',
    status: 'offline',
    score: 91,
    drowsiness: 0,
    phoneDetected: false,
    seatbeltOk: true,
    smokingDetected: false,
    eyesOnRoad: true,
    handsOnWheel: true,
    feedImage: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=800&q=80',
    events: [
      { time: '09:40 AM', label: 'Engine Off - Rest Standby', dot: 'bg-gray-400' },
    ],
  },
  {
    id: 'DRV-105',
    name: 'Samantha Reed',
    vehicle: 'Mack Anthem #5012',
    status: 'online',
    score: 99,
    drowsiness: 1,
    phoneDetected: false,
    seatbeltOk: true,
    smokingDetected: false,
    eyesOnRoad: true,
    handsOnWheel: true,
    feedImage: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
    events: [
      { time: '11:20 AM', label: 'Optimal Driving Performance', dot: 'bg-emerald-500' },
      { time: '10:45 AM', label: 'Shift Commenced', dot: 'bg-primary' },
    ],
  },
]

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

  // Selected driver state
  const [selectedDriverId, setSelectedDriverId] = useState<string>('DRV-101')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'alert'>('all')

  // Feed control states
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isRecording, setIsRecording] = useState(true)
  const [showEndRideModal, setShowEndRideModal] = useState(false)

  // Real-time telemetry state for live camera
  const [liveTelemetry, setLiveTelemetry] = useState({
    score: 98,
    eyesOnRoad: true,
    phoneDetected: false,
    seatbeltOk: true,
    drowsiness: 2,
    faceDetected: true,
    status: 'safe',
    isDistracted: false,
    topClass: 'c0',
    className: 'Safe Driving',
    confidence: 0.98,
    alerts: [] as string[],
  })


  const activeDriver = FLEET_DRIVERS.find(d => d.id === selectedDriverId) || FLEET_DRIVERS[0]

  const filteredDrivers = FLEET_DRIVERS.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || d.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const handleSnapshot = () => {
    toast.success('Snapshot Captured', `Saved live camera frame from ${activeDriver.name} (${activeDriver.vehicle})`)
  }

  // End Ride Confirmation Action
  const handleConfirmEndRide = () => {
    setShowEndRideModal(false)
    toast.success('Ride Ended Successfully', 'Redirecting to AI driving report...')
    const isBiz = user?.role === 'business' || user?.accountType === 'business'
    const targetSummary = isBiz ? '/business/ride-summary' : '/personal/ride-summary'
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
          score: liveTelemetry.score,
          events: {
            phoneUsage: { detected: liveTelemetry.phoneDetected, duration: liveTelemetry.phoneDetected ? '12 sec' : '0 sec', occurrences: liveTelemetry.phoneDetected ? 1 : 0 },
            texting: { detected: false, duration: '0 sec', occurrences: 0 },
            drowsiness: { detected: liveTelemetry.drowsiness > 15, duration: `${liveTelemetry.drowsiness} sec`, occurrences: liveTelemetry.drowsiness > 15 ? 1 : 0 },
            smoking: { detected: false, duration: '0 sec', occurrences: 0 },
            seatBelt: liveTelemetry.seatbeltOk ? 'Always Worn (100% Compliant)' : 'Unbuckled during trip',
            eyesOffRoad: { maxDuration: '2.4 sec', avgAttention: '97%' },
            handsOnWheel: '95%',
            yawning: { detected: false },
          },
          performance: {
            focus: liveTelemetry.eyesOnRoad ? 98 : 82,
            safety: liveTelemetry.score,
            compliance: liveTelemetry.seatbeltOk ? 100 : 70,
            attention: liveTelemetry.eyesOnRoad ? 97 : 80,
            reaction: 93,
          },
          incidents: {
            minor: liveTelemetry.phoneDetected ? 1 : 0,
            major: 0,
            critical: 0,
            nearMisses: 0,
            safeDrivingPct: liveTelemetry.score,
          },
          timeline: activeDriver.events.map(e => ({ time: e.time, label: e.label, type: e.dot.includes('rose') ? 'warning' : 'success' })),
          aiInsights: [
            `Overall safety score: ${liveTelemetry.score}/100.`,
            liveTelemetry.phoneDetected ? 'Phone interaction detected during monitoring.' : 'Zero mobile phone distraction detected.',
            liveTelemetry.seatbeltOk ? 'Seat belt remained securely fastened.' : 'Seat belt unbuckled warning triggered.',
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
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" /> STREAM LATENCY: 38ms
          </span>
        </div>
      </div>

      {/* ── MAIN THREE-PANEL LAYOUT (overflow: hidden, flex-1) ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 min-h-0 overflow-hidden">

        {/* ━━━ 1. LEFT SIDEBAR: DRIVER LIST ━━━━━━━━━━━━━━━━━ */}
        <div className="w-full lg:w-72 bg-card border border-border rounded-2xl p-3 shadow-sm flex flex-col gap-2.5 flex-shrink-0 min-h-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border pb-2 flex-shrink-0">
            <span className="text-xs font-extrabold uppercase tracking-wider text-on-surface flex items-center gap-2">
              <UserIcon size={14} className="text-primary" /> Fleet Roster
            </span>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
              {FLEET_DRIVERS.length} Drivers
            </span>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center justify-between gap-1 bg-surface p-1 rounded-xl border border-border flex-shrink-0">
            {(['all', 'online', 'alert', 'offline'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold capitalize transition-all ${
                  filterStatus === st
                    ? 'bg-card text-on-surface shadow-xs border border-border'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-shrink-0">
            <Search size={14} className="absolute left-3 top-2.5 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-surface text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Driver Selection List (Internal Scroll Only) */}
          <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 min-h-0">
            {filteredDrivers.map(driver => {
              const isSelected = driver.id === activeDriver.id
              return (
                <button
                  key={driver.id}
                  onClick={() => setSelectedDriverId(driver.id)}
                  className={`w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-xs'
                      : 'bg-surface hover:bg-card border-border'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                      {driver.name}
                    </p>
                    <p className="text-[10px] text-on-surface-variant truncate">{driver.vehicle}</p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border flex-shrink-0 ${
                    driver.status === 'online'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : driver.status === 'alert'
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      : 'bg-surface text-on-surface-variant border-border'
                  }`}>
                    {driver.status}
                  </span>
                </button>
              )
            })}
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
                onTelemetryUpdate={(newTel) => setLiveTelemetry(prev => ({ ...prev, ...newTel }))}
                className="w-full h-full"
              />
            </div>

            {/* Bottom Status Strip */}
            <div className="px-3 py-1.5 bg-surface border-t border-border flex items-center justify-between text-[11px] text-on-surface-variant font-medium flex-shrink-0">
              <span>VEHICLE: <span className="font-bold text-on-surface">{activeDriver.vehicle}</span></span>
              <span>SAFETY SCORE: <span className="font-mono font-bold text-emerald-500">{liveTelemetry.score}/100</span></span>
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
                <span className="text-xs font-extrabold text-on-surface font-mono">{liveTelemetry.score}%</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Safety Score
              </span>
              <span className="text-base font-extrabold text-on-surface font-mono">
                {liveTelemetry.score}<span className="text-xs text-primary font-medium">/100</span>
              </span>
              <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">
                {liveTelemetry.score >= 90 ? 'High Compliance' : 'Review Advised'}
              </p>
            </div>
          </div>

          {/* AI Detections List */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">YOLO11 Model</span>
              <span className="font-bold text-[11px] text-emerald-500 font-mono">yolo11n-cls.pt</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">YOLO Prediction</span>
              <span className={`font-bold text-[11px] truncate max-w-[130px] ${liveTelemetry.isDistracted ? 'text-rose-500 font-extrabold' : 'text-emerald-500'}`}>
                {liveTelemetry.className}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">AI Confidence</span>
              <span className="font-bold text-[11px] text-primary font-mono">
                {Math.round((liveTelemetry.confidence || 0.98) * 100)}%
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Seat Belt</span>
              <span className={`font-bold text-[11px] flex items-center gap-1 ${liveTelemetry.seatbeltOk ? 'text-emerald-500' : 'text-rose-500'}`}>
                {liveTelemetry.seatbeltOk ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
                {liveTelemetry.seatbeltOk ? 'COMPLIANT' : 'UNBUCKLED'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Phone Usage</span>
              <span className={`font-bold text-[11px] flex items-center gap-1 ${!liveTelemetry.phoneDetected ? 'text-emerald-500' : 'text-rose-500'}`}>
                {!liveTelemetry.phoneDetected ? <CheckCircle2 size={12} /> : <Smartphone size={12} />}
                {!liveTelemetry.phoneDetected ? 'NONE' : 'DETECTED'}
              </span>
            </div>

            <div className="py-1 border-b border-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant text-[11px]">Fatigue Risk</span>
                <span className="font-bold text-[11px] text-emerald-500">{liveTelemetry.drowsiness}%</span>
              </div>
              <div className="w-full h-1 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${liveTelemetry.drowsiness}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-on-surface-variant text-[11px]">Eyes on Road</span>
              <span className={`font-bold text-[11px] flex items-center gap-1 ${liveTelemetry.eyesOnRoad ? 'text-emerald-500' : 'text-rose-500'}`}>
                {liveTelemetry.eyesOnRoad ? <Eye size={12} /> : <AlertTriangle size={12} />}
                {liveTelemetry.eyesOnRoad ? 'FOCUSED' : 'DISTRACTED'}
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
            {activeDriver.events.map((ev, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-border">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.dot}`} />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-on-surface truncate">{ev.label}</p>
                  <span className="text-[10px] text-on-surface-variant font-mono">{ev.time}</span>
                </div>
              </div>
            ))}
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
              <WebcamFeed isRecording={isRecording} onTelemetryUpdate={(newTel) => setLiveTelemetry(prev => ({ ...prev, ...newTel }))} className="w-full h-full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
})

export default LiveMonitoringCenter
