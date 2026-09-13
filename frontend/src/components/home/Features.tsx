import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  Moon,
  Smartphone,
  Scan,
  ShieldCheck,
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
    description: 'Pinpoints physical cabin objects in real time — mobile phones, seatbelts, passengers — with high-precision bounding boxes.',
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
    description: 'Identifies texting, prolonged glances away from the road, and handheld mobile device usage in milliseconds.',
    tag: 'DISTRACTION',
  },
  {
    icon: Eye,
    title: 'Gaze & Attention Tracking',
    description: 'Tracks eye orientation and head pose disengagement to recognize distracted drivers before dangerous events escalate.',
    tag: 'ATTENTION',
  },
  {
    icon: Volume2,
    title: 'Instant Voice Interventions',
    description: 'Dispatches synthesized voice alerts directly into the cabin to immediately refocus inattentive drivers.',
    tag: 'IN-CABIN AUDIO',
  },
  {
    icon: ShieldCheck,
    title: 'Seatbelt Compliance',
    description: 'Verifies safety restraint compliance throughout the trip, ensuring driver safety and reducing fleet liability.',
    tag: 'COMPLIANCE',
  },
  {
    icon: LayoutDashboard,
    title: 'Centralized Fleet Telemetry',
    description: 'Monitor active vehicles simultaneously with real-time safety scores, vehicle status, and live cabin camera feeds.',
    tag: 'DISPATCH',
  },
  {
    icon: Activity,
    title: 'Dynamic Safety Scoring',
    description: 'Calculates real-time 0-100 safety grades per driver and trip, driving performance improvement and lowering insurance costs.',
    tag: 'ANALYTICS',
  },
  {
    icon: FileText,
    title: 'Automated Incident Audit',
    description: 'Generates detailed incident logs with verified timestamps and event severity for insurance and compliance reports.',
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
