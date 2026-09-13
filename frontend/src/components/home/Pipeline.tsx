import { memo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  Scan,
  Activity,
  Volume2,
  CheckCircle2,
  Eye,
} from 'lucide-react'
import SectionTitle from '../shared/SectionTitle'

interface StepData {
  id: number
  code: string
  title: string
  subtitle: string
  description: string
  tag: string
  hudLabel: string
  hudStatus: string
  hudColor: string
  icon: typeof Camera
  stats: { label: string; value: string }[]
}

const PIPELINE_STEPS: StepData[] = [
  {
    id: 1,
    code: '01',
    title: 'Camera Cabin Monitoring',
    subtitle: 'High-Fidelity Optical Stream',
    description:
      'An interior sensor captures the vehicle cabin in real-time, operating in all ambient lighting environments including zero-lux infrared night drives.',
    tag: 'VIDEO INPUT',
    hudLabel: 'CABIN STREAM 720P',
    hudStatus: 'CAPTURING STREAM',
    hudColor: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
    icon: Camera,
    stats: [
      { label: 'FRAME RATE', value: '30 FPS' },
      { label: 'RESOLUTION', value: '1280x720' },
      { label: 'SENSOR', value: 'IR NIGHT READY' },
    ],
  },
  {
    id: 2,
    code: '02',
    title: 'YOLO11 Object Detection',
    subtitle: 'Spatial Localization & Bounding Boxes',
    description:
      'Ultra-fast YOLO11 neural network runs spatial object detection across cabin objects, returning exact integer coordinates for driver, cell phone, seatbelt, and obstacles.',
    tag: 'NEURAL INFERENCE',
    hudLabel: 'YOLO11 DETECTING',
    hudStatus: 'OBJECTS IDENTIFIED',
    hudColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    icon: Scan,
    stats: [
      { label: 'INFERENCE', value: '24 MS' },
      { label: 'OBJECTS', value: 'PERSON, PHONE, BELT' },
      { label: 'ACCURACY', value: 'HIGH CONFIDENCE' },
    ],
  },
  {
    id: 3,
    code: '03',
    title: 'Driver Behavior & Gaze Analysis',
    subtitle: 'Attention & Head Pose Tracking',
    description:
      'Continuous computer vision tracking monitors eye disengagement, prolonged head tilts, micro-sleeps, and distraction durations before hazards turn into collisions.',
    tag: 'BEHAVIOR GAZE',
    hudLabel: 'DRIVER ATTENTION',
    hudStatus: 'GAZE ON ROAD',
    hudColor: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10',
    icon: Eye,
    stats: [
      { label: 'ATTENTION', value: '98% FOCUSED' },
      { label: 'DROWSINESS', value: 'LEVEL 2 (LOW)' },
      { label: 'BLINKS', value: 'NORMAL RATE' },
    ],
  },
  {
    id: 4,
    code: '04',
    title: 'Intelligent Risk Grading',
    subtitle: 'False-Positive Elimination Engine',
    description:
      'Advanced safety heuristics filter minor hand adjustments, distinguishing critical distractions like texting or dozing off from normal driving operations.',
    tag: 'RISK ASSESSMENT',
    hudLabel: 'SAFETY SCORE 96/100',
    hudStatus: 'MONITORING CLEAR',
    hudColor: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
    icon: Activity,
    stats: [
      { label: 'RISK GRADE', value: 'A+ SAFE' },
      { label: 'FILTERING', value: 'MULTI-FRAME' },
      { label: 'TELEMETRY', value: 'VERIFIED' },
    ],
  },
  {
    id: 5,
    code: '05',
    title: 'Instant Voice Alert & Fleet Notification',
    subtitle: 'Immediate Intervention',
    description:
      'When unsafe behavior is verified, the in-cabin speaker triggers an instant auditory alert to wake or refocus the driver, while event logs dispatch to fleet managers.',
    tag: 'AUDIO INTERVENTION',
    hudLabel: 'ALERT ENGINE ARMED',
    hudStatus: 'VOICE SYNTH READY',
    hudColor: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    icon: Volume2,
    stats: [
      { label: 'SPEECH LATENCY', value: '&lt; 15 MS' },
      { label: 'COOLDOWN', value: 'SMART 5 SEC' },
      { label: 'FLEET SYNC', value: 'WEBHOOK READY' },
    ],
  },
]

const Pipeline = memo(function Pipeline() {
  const [activeStepId, setActiveStepId] = useState(1)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    stepRefs.current.forEach((el, index) => {
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveStepId(index + 1)
          }
        },
        {
          rootMargin: '-30% 0px -40% 0px',
          threshold: 0.1,
        }
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => {
      observers.forEach(obs => obs.disconnect())
    }
  }, [])

  const activeStep = PIPELINE_STEPS.find(s => s.id === activeStepId) || PIPELINE_STEPS[0]
  const ActiveIcon = activeStep.icon

  return (
    <section
      className="bg-surface/50 border-y border-border py-24 md:py-32 relative overflow-hidden"
      aria-label="AI Pipeline"
      id="how-it-works"
    >
      <div className="px-4 md:px-16 max-w-[1440px] mx-auto">
        <SectionTitle
          badge="AI Architecture"
          title="The DriverGuard AI Safety Pipeline"
          subtitle="From optical frame capture to millisecond voice intervention — how our multi-stage pipeline protects every mile."
          centered
          className="mb-16 md:mb-24"
        />

        {/* ━━━ STICKY STORYTELLING LAYOUT ━━━ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start relative">

          {/* ━━━ LEFT: STICKY INTERACTIVE AI HUD VISUALIZER (5 Cols) ━━━ */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 z-20">
            <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
              {/* Subtle background glow matching active state */}
              <div className="absolute -right-16 -bottom-16 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none transition-colors duration-500" />

              {/* HUD Header Bar */}
              <div className="flex items-center justify-between pb-5 border-b border-border/70 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-on-surface">PIPELINE ACTIVE</span>
                </div>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-surface border border-border text-primary font-bold">
                  STAGE {activeStep.code}/05
                </span>
              </div>

              {/* Central Simulated AI Display */}
              <div className="my-6 rounded-2xl border border-border/80 bg-black/60 p-6 relative flex flex-col items-center justify-center min-h-[260px] overflow-hidden">
                
                {/* Laser scan line */}
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/80 to-transparent pointer-events-none"
                  animate={{ top: ['5%', '92%', '5%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />

                {/* Animated Graphic based on Active Step */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep.id}
                    initial={{ scale: 0.85, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.85, opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="flex flex-col items-center text-center gap-4 z-10"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/40 flex items-center justify-center text-primary shadow-[0_0_25px_rgba(37,99,235,0.25)]">
                      <ActiveIcon size={38} />
                    </div>

                    <div>
                      <div className="inline-block px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider mb-1.5 border" style={{ borderColor: 'rgba(37,99,235,0.4)', backgroundColor: 'rgba(37,99,235,0.1)' }}>
                        {activeStep.tag}
                      </div>
                      <h4 className="text-white font-extrabold text-lg tracking-tight">
                        {activeStep.hudLabel}
                      </h4>
                      <p className="text-emerald-400 text-xs font-mono font-semibold mt-1">
                        ● {activeStep.hudStatus}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Simulated Bounding Box Graphic for Step 2 */}
                {activeStep.id === 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-4 border border-emerald-400/50 rounded-lg pointer-events-none"
                  >
                    <span className="absolute top-1 left-2 text-[9px] font-mono text-emerald-400 font-bold">
                      BBOX [194, 0, 632, 423]
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Dynamic Telemetry Metrics Footer */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                {activeStep.stats.map((stat, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-surface/70 border border-border/60">
                    <p className="text-[9px] font-mono text-on-surface-variant font-medium">
                      {stat.label}
                    </p>
                    <p className="text-xs font-mono font-bold text-on-surface mt-0.5 truncate">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* ━━━ RIGHT: SCROLLABLE NARRATIVE STEP CARDS (7 Cols) ━━━ */}
          <div className="lg:col-span-7 space-y-16 py-4">
            {PIPELINE_STEPS.map((step, idx) => {
              const isActive = activeStepId === step.id
              const StepIcon = step.icon

              return (
                <div
                  key={step.id}
                  ref={el => { stepRefs.current[idx] = el }}
                  className={`p-8 md:p-10 rounded-3xl border transition-all duration-400 relative ${
                    isActive
                      ? 'bg-card border-primary/40 shadow-xl shadow-primary/5'
                      : 'bg-card/40 border-border/60 opacity-65 hover:opacity-90'
                  }`}
                >
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <StepIcon size={16} />
                      </div>
                      <span className="text-2xl md:text-3xl font-mono font-extrabold text-primary">
                        {step.code}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-surface border border-border text-on-surface-variant">
                      {step.tag}
                    </span>
                  </div>

                  <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface mb-2">
                    {step.title}
                  </h3>

                  <p className="text-sm font-semibold text-primary/90 mb-4">
                    {step.subtitle}
                  </p>

                  <p className="text-on-surface-variant text-base leading-relaxed">
                    {step.description}
                  </p>

                  <div className="mt-6 pt-5 border-t border-border/50 flex items-center gap-2 text-xs font-mono text-emerald-500 font-semibold">
                    <CheckCircle2 size={14} />
                    <span>AUTOMATED PIPELINE VALIDATED</span>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </section>
  )
})

export default Pipeline
