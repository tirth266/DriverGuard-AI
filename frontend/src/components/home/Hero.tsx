import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Activity, Cpu } from 'lucide-react'
import Button from '../shared/Button'
import { useAuth } from '../../context/AuthContext'

const HERO_POSTER =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCcKaLxmdIZwnR0lQmtyJqnulBLej0a0G8kFHVn1alPzu5Bih45tWBAph9k-Y_O-mDBiS96RZ6X6Pm6niij5B-CplXhXHUVFwTuaIm9ON1SnuBg7edeuTBmwyT-UrudvWqkJQYfwkRmLV4JkTFdmL0Za-_fIa5CC0_p2urfVKpFZ5yHicpcA_Xzpw1Baf5ENstaxctcRb9e5Ob1HFkQ9ZCUPonuqkQZT2f-2yawldUCYahojUrdLzzydNygLW_VYW37cVHmdtONPi4'

export default memo(function Hero() {
  const [isHovered, setIsHovered] = useState(false)
  const { isAuthenticated, user } = useAuth()

  const destination = isAuthenticated
    ? (user?.accountType === 'business' ? '/business/dashboard' : '/personal/dashboard')
    : '/auth'

  return (
    <section
      id="top"
      className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-6 max-w-[1280px] mx-auto overflow-hidden"
      aria-label="Overview & Safety Status"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">

        {/* ─── LEFT: Editorial Headline & Actions (7 Cols) ─── */}
        <div className="lg:col-span-7 space-y-7">
          
          {/* Status / Product Label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] border border-border bg-surface text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" />
            <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-text-primary">
              Computer Vision Fleet Safety
            </span>
          </div>

          {/* Editorial Headline */}
          <h1 className="font-display text-[44px] sm:text-[56px] lg:text-[64px] leading-[1.05] tracking-[-0.035em] font-extrabold text-text-primary">
            Protect Every Journey
            <br />
            with Intelligent
            <br />
            <span className="text-brand">Driver Monitoring</span>
          </h1>

          {/* Concise, Professional Supporting Copy */}
          <p className="text-text-secondary text-base sm:text-lg leading-[1.65] max-w-xl font-normal">
            Real-time cabin computer vision powered by YOLO11. Detect fatigue, phone distraction,
            and seatbelt compliance in under 30 milliseconds — preventing collisions before they occur.
          </p>

          {/* Meaningful Actions */}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <Link to={destination}>
              <Button variant="primary" size="lg" className="gap-2">
                <span>{isAuthenticated ? 'Launch Fleet Console' : 'Start Monitoring Free'}</span>
                <ArrowRight size={15} />
              </Button>
            </Link>

            <a href="#cv-showcase">
              <Button variant="secondary" size="lg">
                See What the Model Sees
              </Button>
            </a>
          </div>

          {/* Restrained Technical Engineering Bar */}
          <div className="pt-6 border-t border-border/70 flex items-center gap-6 text-[12px] font-mono text-text-muted flex-wrap">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-safe" />
              <span>INFERENCE: &lt;25MS</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu size={13} className="text-brand" />
              <span>MODEL: YOLO11-EDGE</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={13} className="text-safe" />
              <span>SPATIAL HUD ACTIVE</span>
            </div>
          </div>

        </div>

        {/* ─── RIGHT: Clean Real Product CV Visual (5 Cols) ─── */}
        <div
          className="lg:col-span-5 relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative rounded-[20px] overflow-hidden border border-white/12 bg-surface shadow-xl">
            
            {/* Main Video / Poster */}
            <div className="relative aspect-[4/3] bg-[#070707] overflow-hidden">
              <video
                src="/driver-video.mp4"
                poster={HERO_POSTER}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover opacity-90 transition-transform duration-500 ease-out"
                aria-label="Real-time computer vision driver monitoring system feed"
              />

              {/* Laser Scan Line (Subtle) */}
              <motion.div
                className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand to-transparent pointer-events-none z-10 opacity-60"
                animate={{ top: ['4%', '94%', '4%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              />

              {/* Calibrated Bounding Box: Person (Driver) */}
              <div
                className={`absolute top-[12%] left-[28%] w-[46%] h-[72%] pointer-events-none z-20 transition-all duration-200 ${
                  isHovered ? 'scale-[1.01]' : 'scale-100'
                }`}
              >
                <div className="w-full h-full border border-safe/90 relative">
                  {/* Precision Corner Tick Marks */}
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-safe" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-safe" />
                  <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-safe" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-safe" />

                  {/* Clean Technical Tag */}
                  <div className="absolute -top-5 left-0 bg-[#070707]/90 px-1.5 py-0.5 border border-safe/50 rounded-[4px] text-[10px] font-mono font-bold text-safe flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-safe" />
                    <span>DRIVER: 99%</span>
                  </div>

                  {/* Secondary Gaze Indicator */}
                  <div className="absolute bottom-1 right-1 bg-[#070707]/80 px-1 py-0.5 rounded-[4px] text-[9px] font-mono text-white/80">
                    GAZE: FORWARD
                  </div>
                </div>
              </div>

              {/* Overlay 1: Top HUD Telemetry */}
              <div className="absolute top-3 right-3 bg-[#070707]/85 border border-white/10 px-2.5 py-1 rounded-[6px] text-[10px] font-mono text-text-secondary flex items-center gap-2 z-20">
                <span className="w-1.5 h-1.5 rounded-full bg-safe" />
                <span>YOLO11 · 30 FPS</span>
              </div>

              {/* Overlay 2: Bottom Status Indicator */}
              <div className="absolute bottom-3 left-3 bg-[#070707]/85 border border-white/10 px-2.5 py-1 rounded-[6px] text-[11px] font-mono text-text-primary flex items-center gap-1.5 z-20">
                <ShieldCheck size={13} className="text-safe" />
                <span>STATUS: VERIFIED SAFE</span>
              </div>

            </div>

            {/* Bottom Meta Stripe */}
            <div className="px-4 py-2.5 bg-surface border-t border-border flex items-center justify-between text-[11px] font-mono text-text-muted">
              <span>STREAM: 1080P CABIN-WIDE</span>
              <span className="text-safe font-semibold">ALL SENSORS NORMAL</span>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
})
