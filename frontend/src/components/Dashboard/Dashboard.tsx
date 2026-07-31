import { memo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Eye, EyeOff, Activity, Hand, Radio } from 'lucide-react'

// Reliable high-res driver monitoring cockpit image
const DRIVER_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCcKaLxmdIZwnR0lQmtyJqnulBLej0a0G8kFHVn1alPzu5Bih45tWBAph9k-Y_O-mDBiS96RZ6X6Pm6niij5B-CplXhXHUVFwTuaIm9ON1SnuBg7edeuTBmwyT-UrudvWqkJQYfwkRmLV4JkTFdmL0Za-_fIa5CC0_p2urfVKpFZ5yHicpcA_Xzpw1Baf5ENstaxctcRb9e5Ob1HFkQ9ZCUPonuqkQZT2f-2yawldUCYahojUrdLzzydNygLW_VYW37cVHmdtONPi4'

const TIMELINE_EVENTS = [
  { time: '08:15', type: 'safe' as const },
  { time: '08:19', type: 'minor' as const },
  { time: '08:22', type: 'major' as const },
  { time: '08:29', type: 'safe' as const },
  { time: '08:35', type: 'safe' as const },
  { time: '08:42', type: 'safe' as const },
]

function CircularGauge({ value, size = 90 }: { value: number; size?: number }) {
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden="true">
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-border"
        strokeWidth={6}
      />
      {/* Foreground arc */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#2563eb"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
    </svg>
  )
}

function useClockTime() {
  const [time, setTime] = useState('08:45:32 AM')
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      )
    }, 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

const Dashboard = memo(function Dashboard() {
  const time = useClockTime()

  return (
    <div
      className="min-h-[calc(100vh-56px)] bg-background text-on-surface flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300"
      aria-label="DriverGuard AI Dashboard"
    >
      {/* Dashboard frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-5xl bg-card rounded-2xl border border-border overflow-hidden shadow-lg transition-colors duration-300"
      >
        {/* ── Top bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 bg-surface border-b border-border transition-colors duration-300">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
              <Shield className="text-primary" size={14} aria-hidden="true" />
            </div>
            <span className="text-on-surface font-bold text-sm tracking-wider">DRIVERGUARD</span>
            <span className="text-primary font-bold text-sm tracking-widest">AI</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-on-surface-variant font-medium tracking-wider uppercase">
            <span className="flex items-center gap-1.5">
              <Radio size={12} className="text-emerald-500 animate-pulse" />
              STATUS: <span className="text-emerald-500 font-bold">OPERATIONAL</span>
            </span>
            <span>
              GPS: <span className="text-emerald-500 font-bold">LOCKED</span>
            </span>
            <span>
              NETWORK: <span className="text-emerald-500 font-bold">5G</span>
            </span>
            <span className="text-on-surface font-bold font-mono bg-background px-2.5 py-1 rounded border border-border">
              {time}
            </span>
          </div>
        </div>

        {/* ── Main content grid ── */}
        <div className="flex flex-col lg:flex-row">
          {/* Left — Camera feed */}
          <div className="flex-1 relative min-h-[300px] lg:min-h-[400px] border-b lg:border-b-0 lg:border-r border-border">
            {/* Header bar over feed */}
            <div className="flex items-center justify-between px-4 py-2 bg-black/40 text-white border-b border-white/10 backdrop-blur-sm relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">
                  INFRARED FEED:
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot block" />
                  ACTIVE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Eye size={14} className="text-gray-300" aria-hidden="true" />
                <span className="w-2.5 h-2.5 rounded-full border border-emerald-400/50 bg-emerald-400/30 block" />
              </div>
            </div>

            {/* Camera image & AI HUD overlay */}
            <div className="relative h-full min-h-[300px] lg:min-h-[360px] bg-black overflow-hidden">
              <img
                src={DRIVER_IMAGE}
                alt="AI-powered infrared camera feed showing real-time driver monitoring with HUD bounding boxes"
                className="w-full h-full object-cover opacity-90 grayscale-[20%]"
                loading="eager"
              />

              {/* Green bounding box & skeleton keypoints overlay */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 550 380"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {/* Head bounding box */}
                <rect x="170" y="30" width="200" height="180" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.9" />
                {/* Body bounding box */}
                <rect x="120" y="150" width="310" height="200" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.7" />
                {/* Corner ticks for head box */}
                <line x1="170" y1="30" x2="190" y2="30" stroke="#22c55e" strokeWidth="2.5" />
                <line x1="170" y1="30" x2="170" y2="50" stroke="#22c55e" strokeWidth="2.5" />
                <line x1="370" y1="30" x2="350" y2="30" stroke="#22c55e" strokeWidth="2.5" />
                <line x1="370" y1="30" x2="370" y2="50" stroke="#22c55e" strokeWidth="2.5" />
                <line x1="170" y1="210" x2="190" y2="210" stroke="#22c55e" strokeWidth="2.5" />
                <line x1="170" y1="210" x2="170" y2="190" stroke="#22c55e" strokeWidth="2.5" />
                <line x1="370" y1="210" x2="350" y2="210" stroke="#22c55e" strokeWidth="2.5" />
                <line x1="370" y1="210" x2="370" y2="190" stroke="#22c55e" strokeWidth="2.5" />
                {/* Keypoint nodes */}
                <circle cx="265" cy="85" r="3.5" fill="#22c55e" />
                <circle cx="240" cy="160" r="3" fill="#3b82f6" />
                <circle cx="290" cy="160" r="3" fill="#3b82f6" />
                <circle cx="210" cy="240" r="3" fill="#3b82f6" />
                <circle cx="320" cy="240" r="3" fill="#3b82f6" />
                <line x1="265" y1="85" x2="240" y2="160" stroke="#3b82f6" strokeWidth="1.2" opacity="0.6" />
                <line x1="265" y1="85" x2="290" y2="160" stroke="#3b82f6" strokeWidth="1.2" opacity="0.6" />
                <line x1="240" y1="160" x2="210" y2="240" stroke="#3b82f6" strokeWidth="1.2" opacity="0.5" />
                <line x1="290" y1="160" x2="320" y2="240" stroke="#3b82f6" strokeWidth="1.2" opacity="0.5" />
              </svg>

              {/* Scanning laser line */}
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent pointer-events-none"
                animate={{ top: ['5%', '92%', '5%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
            </div>

            {/* Bottom info bar over feed */}
            <div className="px-4 py-2 bg-surface border-t border-border flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-variant font-medium tracking-wider uppercase">
              <div className="flex items-center gap-3">
                <span>
                  STREAM: <span className="text-emerald-500 font-bold">1080P HD</span>
                </span>
                <span>
                  DRIVER ID: <span className="text-emerald-500 font-bold">VERIFIED</span>
                </span>
              </div>
              <span className="text-on-surface-variant font-semibold">DRIVER #4082 — JOHN D.</span>
            </div>
          </div>

          {/* Right — Analysis panels */}
          <div className="w-full lg:w-80 flex flex-col bg-card transition-colors duration-300">
            <div className="px-4 py-3 bg-surface border-b border-border">
              <p className="text-[11px] font-bold text-on-surface-variant tracking-wider uppercase">
                REAL-TIME BEHAVIOR ANALYSIS
              </p>
            </div>

            <div className="flex flex-col flex-1 divide-y divide-border">
              {/* Safe Driving Gauge */}
              <div className="px-4 py-5 flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <CircularGauge value={98} size={84} />
                  <div className="absolute inset-0 flex items-center justify-center rotate-[90deg]">
                    <span className="text-[13px] font-extrabold text-primary">98%</span>
                  </div>
                </div>
                <div>
                  <p className="text-on-surface font-bold text-sm tracking-wide">
                    SAFE DRIVING: <span className="text-primary font-extrabold">98%</span>
                  </p>
                  <p className="text-[10px] text-on-surface-variant tracking-wider uppercase mt-1">
                    CONFIDENCE SCORE:
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 font-medium">
                    ROAD FOCUS:{' '}
                    <span className="text-emerald-500 font-bold">95% — OPTIMAL</span>
                  </p>
                </div>
              </div>

              {/* Attention Level Waveform */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-primary" aria-hidden="true" />
                    <span className="text-[11px] font-bold text-on-surface-variant tracking-wider uppercase">
                      ATTENTION LEVEL:{' '}
                      <span className="text-amber-500">HIGH</span>
                    </span>
                  </div>
                  <span className="text-on-surface font-extrabold text-sm">92%</span>
                </div>
                {/* Animated waveform bars */}
                <div className="flex items-center gap-1 h-6">
                  {Array.from({ length: 22 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 bg-primary/80 rounded-full"
                      animate={{ height: [`${25 + Math.random() * 75}%`, `${25 + Math.random() * 75}%`] }}
                      transition={{ duration: 0.4 + Math.random() * 0.4, repeat: Infinity, repeatType: 'reverse' }}
                      style={{ height: `${35 + (i % 4) * 18}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Drowsiness Indicator */}
              <div className="px-4 py-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <EyeOff size={16} className="text-emerald-500" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-on-surface-variant tracking-wider uppercase">
                    DROWSINESS:{' '}
                    <span className="text-emerald-500 font-extrabold">2% (LOW)</span>
                  </p>
                  <div className="w-full h-1.5 bg-surface border border-border mt-1.5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '2%' }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>

              {/* Hands on Wheel */}
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Hand size={16} className="text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-on-surface-variant tracking-wider uppercase">
                      HANDS ON WHEEL
                    </p>
                    <p className="text-[11px] text-emerald-500 font-bold uppercase">
                      DETECTED — BOTH HANDS
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center" title="Left hand detected">
                    <Hand size={12} className="text-emerald-500" />
                  </div>
                  <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center" title="Right hand detected">
                    <Hand size={12} className="text-emerald-500 scale-x-[-1]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Timeline ── */}
        <div className="border-t border-border px-6 py-4 bg-surface transition-colors duration-300">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-on-surface-variant tracking-wider uppercase">
              DISTRACTION EVENTS TIMELINE — LAST 30 MIN
            </p>
          </div>

          {/* Timeline track */}
          <div className="relative pt-2 pb-1">
            <div className="w-full h-1 bg-border rounded-full" />
            <div className="flex justify-between mt-2">
              {TIMELINE_EVENTS.map((evt) => {
                const dotColor =
                  evt.type === 'safe'
                    ? 'bg-emerald-500 ring-emerald-500/20'
                    : evt.type === 'minor'
                    ? 'bg-amber-500 ring-amber-500/20'
                    : 'bg-rose-500 ring-rose-500/20'
                return (
                  <div key={evt.time} className="flex flex-col items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full ${dotColor} ring-4 -mt-[17px] shadow-sm`} />
                    <span className="text-[11px] text-on-surface-variant font-medium font-mono">{evt.time}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-6 mt-3 text-[11px] text-on-surface-variant tracking-wider uppercase font-medium border-t border-border pt-3">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
              Green: Normal / Safe
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
              Yellow: Minor Distraction
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
              Red: Major Distraction / Alert
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
})

export default Dashboard

