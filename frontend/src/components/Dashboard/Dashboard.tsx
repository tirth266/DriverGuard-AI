import { memo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Eye, EyeOff, Activity, Hand } from 'lucide-react'

const DRIVER_IMAGE =
  'https://lh3.googleusercontent.com/aida/AP1WRLtMBg9fDpGAjIlIh87Q6UJNrgZORp6AEBQnYour3Js2YjaC5UNyK_BpDldkBMTEH9dUdS0th6r7bUcRGhgV9Y8QTobauEkS-MHX5EHiG05BKkXTzUkLKQLhVuXPzxGtqXAGK4a5efky6XyRg5idUmfNRKsaRX_VfFjPWw4DoYd9PchrnuKsQYkf1zv5Y8d6FTldliQPe2iU_qCTElCaeSxRikdaSZGIlcX2L9gUQLCj8BIY6A3ao53pXX0'

const TIMELINE_EVENTS = [
  { time: '08:15', type: 'safe' as const },
  { time: '08:19', type: 'minor' as const },
  { time: '08:22', type: 'major' as const },
  { time: '08:29', type: 'safe' as const },
  { time: '08:35', type: 'safe' as const },
  { time: '08:42', type: 'safe' as const },
]

function CircularGauge({ value, size = 100 }: { value: number; size?: number }) {
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
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={6}
      />
      {/* Foreground arc */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#5de6ff"
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
      className="min-h-screen bg-[#0B0F17] flex flex-col items-center justify-center p-4 md:p-8"
      aria-label="Sentinel Drive AI Dashboard"
    >
      {/* Dashboard frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-5xl bg-[#0e1219] rounded-2xl border border-white/10 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]"
      >
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#121620] border-b border-white/8">
          <div className="flex items-center gap-2">
            <Shield className="text-secondary" size={18} aria-hidden="true" />
            <span className="text-white font-bold text-sm tracking-wider">SENTINEL</span>
            <span className="text-secondary font-light text-sm tracking-widest ml-1">DRIVE AI</span>
          </div>
          <div className="flex items-center gap-6 text-[11px] text-[#8a8fa8] font-medium tracking-widest uppercase">
            <span>
              SYSTEM STATUS:{' '}
              <span className="text-green-400">OPERATIONAL</span>
            </span>
            <span>
              GPS:{' '}
              <span className="text-green-400">LOCKED</span>
            </span>
            <span>
              NETWORK:{' '}
              <span className="text-green-400">5G</span>
            </span>
            <span className="text-white font-bold">{time}</span>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex flex-col lg:flex-row gap-0">
          {/* Left — camera feed */}
          <div className="flex-1 relative min-h-[300px] lg:min-h-[400px]">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#8a8fa8] tracking-widest uppercase">
                  INFRARED FEED:
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot block" />
                  ACTIVE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Eye size={14} className="text-[#8a8fa8]" aria-hidden="true" />
                <span className="w-3 h-3 rounded-full border border-green-400/50 bg-green-400/20 block" />
              </div>
            </div>

            {/* Camera image */}
            <div className="relative h-full min-h-[280px] lg:min-h-[350px] overflow-hidden">
              <img
                src={DRIVER_IMAGE}
                alt="Infrared camera feed showing driver being monitored by AI with green bounding boxes"
                className="w-full h-full object-cover opacity-85 grayscale-[30%]"
                loading="lazy"
              />

              {/* Green bounding box overlay */}
              <svg
                className="absolute inset-0 w-full h-full"
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
                {/* Skeleton keypoints */}
                <circle cx="265" cy="85" r="3" fill="#22c55e" opacity="0.8" />
                <circle cx="240" cy="160" r="2.5" fill="#5de6ff" opacity="0.7" />
                <circle cx="290" cy="160" r="2.5" fill="#5de6ff" opacity="0.7" />
                <circle cx="210" cy="240" r="2.5" fill="#5de6ff" opacity="0.6" />
                <circle cx="320" cy="240" r="2.5" fill="#5de6ff" opacity="0.6" />
                <line x1="265" y1="85" x2="240" y2="160" stroke="#5de6ff" strokeWidth="1" opacity="0.5" />
                <line x1="265" y1="85" x2="290" y2="160" stroke="#5de6ff" strokeWidth="1" opacity="0.5" />
                <line x1="240" y1="160" x2="210" y2="240" stroke="#5de6ff" strokeWidth="1" opacity="0.4" />
                <line x1="290" y1="160" x2="320" y2="240" stroke="#5de6ff" strokeWidth="1" opacity="0.4" />
              </svg>

              {/* Scanning line */}
              <motion.div
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400/60 to-transparent"
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
            </div>

            {/* Bottom info bar */}
            <div className="px-4 py-2 bg-black/60 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px] text-[#8a8fa8] tracking-widest uppercase font-medium">
                <span>
                  INFRARED FEED:{' '}
                  <span className="text-green-400">ACTIVE</span>
                </span>
                <span>
                  DRIVER ID:{' '}
                  <span className="text-green-400">DETECTED</span>
                </span>
                <span className="text-[#6b7280]">— JOHN D. 08:49 AM</span>
              </div>
            </div>
          </div>

          {/* Right — analysis panels */}
          <div className="w-full lg:w-72 xl:w-80 flex flex-col border-l border-white/8">
            <div className="px-4 py-3 bg-[#121620] border-b border-white/5">
              <p className="text-[10px] font-bold text-[#8a8fa8] tracking-widest uppercase">
                REAL-TIME BEHAVIOR ANALYSIS
              </p>
            </div>

            <div className="flex flex-col gap-0 flex-1">
              {/* Safe Driving gauge */}
              <div className="px-4 py-5 border-b border-white/5 flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <CircularGauge value={98} size={90} />
                  <div className="absolute inset-0 flex items-center justify-center rotate-[90deg]">
                    <span className="text-[11px] font-bold text-secondary">98%</span>
                  </div>
                </div>
                <div>
                  <p className="text-white font-bold text-sm tracking-wide">
                    SAFE DRIVING: <span className="text-secondary">98%</span>
                  </p>
                  <p className="text-[10px] text-[#8a8fa8] tracking-widest uppercase mt-1">
                    CONFIDENCE SCORE:
                  </p>
                  <p className="text-[11px] text-[#8a8fa8] mt-0.5">
                    LOOKING AHEAD:{' '}
                    <span className="text-green-400 font-bold">95% — OPTIMAL</span>
                  </p>
                </div>
              </div>

              {/* Attention Level */}
              <div className="px-4 py-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-[#8a8fa8]" aria-hidden="true" />
                    <span className="text-[10px] font-bold text-[#8a8fa8] tracking-widest uppercase">
                      ATTENTION LEVEL:{' '}
                      <span className="text-yellow-400">HIGH</span>
                    </span>
                  </div>
                  <span className="text-white font-bold text-sm">92%</span>
                </div>
                {/* Waveform bars */}
                <div className="flex items-center gap-0.5 h-5">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 bg-secondary/70 rounded-sm"
                      animate={{ height: [`${30 + Math.random() * 70}%`, `${30 + Math.random() * 70}%`] }}
                      transition={{ duration: 0.5 + Math.random() * 0.5, repeat: Infinity, repeatType: 'reverse' }}
                      style={{ height: `${40 + (i % 3) * 20}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Drowsiness */}
              <div className="px-4 py-4 border-b border-white/5 flex items-center gap-3">
                <EyeOff size={16} className="text-[#8a8fa8] flex-shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-[#8a8fa8] tracking-widest uppercase">
                    DROWSINESS:{' '}
                    <span className="text-green-400">LOW (2%)</span>
                    {' — '}
                    <span className="text-[#8a8fa8]">MONITORING</span>
                  </p>
                  <div className="w-full h-0.5 bg-white/10 mt-2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-green-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '2%' }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>

              {/* Hands on Wheel */}
              <div className="px-4 py-4 flex items-center gap-3">
                <Hand size={16} className="text-[#8a8fa8] flex-shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-[#8a8fa8] tracking-widest uppercase">
                    HANDS ON WHEEL:{' '}
                    <span className="text-green-400">DETECTED</span>
                    {' — LEFT & RIGHT'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <div className="w-5 h-5 rounded bg-green-400/20 border border-green-400/40 flex items-center justify-center">
                    <Hand size={10} className="text-green-400" />
                  </div>
                  <div className="w-5 h-5 rounded bg-green-400/20 border border-green-400/40 flex items-center justify-center">
                    <Hand size={10} className="text-green-400 scale-x-[-1]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Timeline ── */}
        <div className="border-t border-white/8 px-6 py-4 bg-[#0e1219]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-[#8a8fa8] tracking-widest uppercase">
              DISTRACTION EVENTS TIMELINE — LAST 30 MIN.
            </p>
          </div>

          {/* Timeline track */}
          <div className="relative">
            <div className="w-full h-px bg-white/10 rounded-full" />
            <div className="flex justify-between mt-3">
              {TIMELINE_EVENTS.map((evt) => {
                const dotColor =
                  evt.type === 'safe'
                    ? 'bg-green-400'
                    : evt.type === 'minor'
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
                return (
                  <div key={evt.time} className="flex flex-col items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${dotColor} -mt-[17px]`} />
                    <span className="text-[10px] text-[#8a8fa8] font-medium">{evt.time}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-3 text-[10px] text-[#8a8fa8] tracking-widest uppercase">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 block" />
              Green: Safe
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400 block" />
              Yellow: Minor Distraction
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 block" />
              Red: Major Distraction
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
})

export default Dashboard
