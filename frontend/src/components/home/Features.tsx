import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  Moon,
  Smartphone,
  Scan,
  Eye,
  Volume2,
  LayoutDashboard,
  FileText,
  Activity,
} from 'lucide-react'
import SectionTitle from '../shared/SectionTitle'

const FEATURES = [
  {
    icon: Scan,
    title: 'YOLO11 Object Detection',
    description: 'Detects cabin objects the model is trained on — phones, drinks, food — and returns a bounding box and confidence for each.',
    tag: 'CV ENGINE',
  },
  {
    icon: Moon,
    title: 'Driver Fatigue Detection',
    description: 'Detects micro-sleeps and continuous eye closure before accidents happen, keeping drivers alert on long routes.',
    tag: 'DROWSINESS',
  },
  {
    icon: Smartphone,
    title: 'Distracted Driving Alerts',
    description: 'Flags a confirmed phone detection, and infers a suspected call when landmarks suggest a phone at the ear without a detection behind it.',
    tag: 'DISTRACTION',
  },
  {
    icon: Eye,
    title: 'Head Pose & Eye Signals',
    description: 'Reads head orientation and eye openness from face landmarks to flag eyes closed, drowsiness and yawning. Eye-gaze direction is not measured.',
    tag: 'ATTENTION',
  },
  {
    icon: Volume2,
    title: 'In-App Alert Tone',
    description: 'Plays a short tone on the monitoring screen when an eye alert fires. It is an alert cue on the device, not a cabin speaker.',
    tag: 'IN-APP AUDIO',
  },
  {
    icon: LayoutDashboard,
    title: 'Fleet Roster Management',
    description: 'Keeps a fleet of drivers and vehicles, with each driver record tied to the company that owns it.',
    tag: 'DISPATCH',
  },
  {
    icon: Activity,
    title: 'Dynamic Safety Scoring',
    description: 'Scores each monitored ride from 0-100 using confirmed events and their durations, and stores the result on the ride.',
    tag: 'ANALYTICS',
  },
  {
    icon: FileText,
    title: 'Ride Event Log & Report',
    description: 'Records each confirmed event against its ride with timestamps and durations, and produces a report from that record.',
    tag: 'AUDITING',
  },
]

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const Icon = feature.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.4,
        delay: (index % 3) * 0.08,
        ease: 'easeOut',
      }}
      className="h-full"
    >
      <div className="p-7 h-full flex flex-col justify-between rounded-[16px] border border-white/10 bg-surface hover:border-white/20 transition-all duration-200 group">
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="w-10 h-10 rounded-[10px] bg-brand/10 border border-brand/20 flex items-center justify-center text-brand transition-colors">
              <Icon size={18} aria-hidden="true" />
            </div>
            <span className="text-[10px] font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded-[4px] bg-card border border-border text-text-muted">
              {feature.tag}
            </span>
          </div>

          <h3 className="font-display text-base font-bold text-text-primary mb-2 tracking-tight">
            {feature.title}
          </h3>

          <p className="text-text-secondary text-xs leading-[1.65]">
            {feature.description}
          </p>
        </div>

        <div className="mt-5 pt-3.5 border-t border-border/60 flex items-center gap-1 text-[11px] font-medium text-text-muted group-hover:text-text-primary transition-colors">
          <span>Technical specifications</span>
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </div>
      </div>
    </motion.div>
  )
}

export default memo(function Features() {
  return (
    <section
      className="px-6 max-w-[1280px] mx-auto py-20 md:py-28"
      aria-label="Platform features"
      id="features"
    >
      <SectionTitle
        badge="Platform Capabilities"
        title="Engineered for Fleet Safety"
        subtitle="End-to-end computer vision and real-time telemetry designed for enterprise transport."
        centered
        className="mb-12"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((feature, i) => (
          <FeatureCard key={feature.title} feature={feature} index={i} />
        ))}
      </div>
    </section>
  )
})
