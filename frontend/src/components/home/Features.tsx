import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  Moon,
  Smartphone,
  Cigarette,
  ShieldCheck,
  ScanFace,
  Volume2,
  LayoutDashboard,
  FileText,
  BellRing,
} from 'lucide-react'
import GlassCard from '../shared/Card'
import SectionTitle from '../shared/SectionTitle'
import { use3DTilt } from '../../hooks/use3DTilt'

const FEATURES = [
  {
    icon: Moon,
    title: 'Driver Fatigue Detection',
    description: 'Detects signs of drowsiness before accidents happen, keeping drivers alert on every journey.',
  },
  {
    icon: Smartphone,
    title: 'Phone Usage Detection',
    description: 'Alerts when drivers use mobile devices while operating vehicles, reducing distraction risks.',
  },
  {
    icon: Cigarette,
    title: 'Smoking Detection',
    description: 'Monitors smoking inside vehicles to enforce safety policies and maintain fleet standards.',
  },
  {
    icon: ShieldCheck,
    title: 'Seat Belt Compliance',
    description: 'Ensures all drivers comply with seat belt policies, protecting your team and reducing liability.',
  },
  {
    icon: ScanFace,
    title: 'Driver Attention Monitoring',
    description: 'Tracks eye and head movement patterns to detect inattentive driving before it becomes dangerous.',
  },
  {
    icon: Volume2,
    title: 'Real-Time Voice Alerts',
    description: 'Warns drivers instantly with voice alerts before dangerous situations escalate.',
  },
  {
    icon: LayoutDashboard,
    title: 'Fleet Dashboard',
    description: 'Monitor all vehicles from one centralized dashboard with live safety status and insights.',
  },
  {
    icon: FileText,
    title: 'Incident Reports',
    description: 'Automatic reports and event history for compliance, training, and insurance documentation.',
  },
  {
    icon: BellRing,
    title: 'Live Notifications',
    description: 'Receive instant alerts on your phone or dashboard when safety events are detected.',
  },
]

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const Icon = feature.icon
  const tilt = use3DTilt({ maxRotation: 5, scale: 1.02 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.08, ease: 'easeOut' }}
    >
      <div
        ref={tilt.ref}
        style={tilt.style}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
        className="h-full"
      >
        <GlassCard className="glass-card-hover p-8 h-full flex flex-col gap-4 rounded-2xl group cursor-pointer transition-shadow hover:shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
            <Icon
              size={24}
              className="text-primary group-hover:text-white transition-all duration-300 group-hover:scale-110"
              aria-hidden="true"
            />
          </div>
          <h3 className="font-headline-md text-[20px] leading-[1.3] font-semibold text-on-surface">
            {feature.title}
          </h3>
          <p className="text-on-surface-variant text-body-md leading-[1.6]">
            {feature.description}
          </p>
        </GlassCard>
      </div>
    </motion.div>
  )
}

const Features = memo(function Features() {
  return (
    <section
      className="px-4 md:px-16 max-w-[1440px] mx-auto py-[100px] bg-background"
      aria-label="Features section"
      id="features"
    >
      <SectionTitle
        badge="Features"
        title="Everything You Need for Fleet Safety"
        subtitle="Advanced AI-powered monitoring capabilities designed to protect your drivers and reduce fleet risk."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((feature, i) => (
          <FeatureCard key={feature.title} feature={feature} index={i} />
        ))}
      </div>
    </section>
  )
})

export default Features
