import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  Truck,
  Bus,
  GraduationCap,
  Car,
  HardHat,
  Building,
  Siren,
  Building2,
} from 'lucide-react'
import SectionTitle from '../shared/SectionTitle'
import GlassCard from '../shared/Card'
import { use3DTilt } from '../../hooks/use3DTilt'

const INDUSTRIES = [
  { icon: Truck, title: 'Logistics', description: 'Protect long-haul and last-mile delivery drivers across your entire fleet.' },
  { icon: Bus, title: 'Public Transport', description: 'Ensure passenger safety with continuous driver monitoring on every route.' },
  { icon: GraduationCap, title: 'School Buses', description: 'Keep children safe with the highest standard of driver behavior monitoring.' },
  { icon: Car, title: 'Taxi Services', description: 'Maintain driver quality and passenger confidence with real-time oversight.' },
  { icon: HardHat, title: 'Mining', description: 'Monitor operators in high-risk mining environments where fatigue is critical.' },
  { icon: Building, title: 'Construction', description: 'Prevent accidents at construction sites with vigilant driver monitoring.' },
  { icon: Siren, title: 'Emergency Vehicles', description: 'Support first responders with safety systems that work under pressure.' },
  { icon: Building2, title: 'Corporate Fleets', description: 'Protect your company vehicles and drivers with enterprise-grade safety.' },
]

function IndustryCard({ industry, index }: { industry: typeof INDUSTRIES[0]; index: number }) {
  const Icon = industry.icon
  const tilt = use3DTilt({ maxRotation: 5, scale: 1.02 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, delay: (index % 4) * 0.07, ease: 'easeOut' }}
    >
      <div
        ref={tilt.ref}
        style={tilt.style}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
        className="h-full"
      >
        <GlassCard className="glass-card-hover p-6 h-full flex flex-col gap-4 rounded-2xl group cursor-pointer transition-shadow hover:shadow-xl">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300 group-hover:scale-110">
            <Icon size={22} className="text-primary group-hover:text-white transition-colors duration-300" aria-hidden="true" />
          </div>
          <h3 className="text-[18px] font-semibold text-on-surface leading-tight">
            {industry.title}
          </h3>
          <p className="text-on-surface-variant text-[14px] leading-[1.6]">
            {industry.description}
          </p>
        </GlassCard>
      </div>
    </motion.div>
  )
}

const Industries = memo(function Industries() {
  return (
    <section
      className="px-4 md:px-16 max-w-[1440px] mx-auto py-[100px] bg-background"
      aria-label="Industries we serve"
      id="industries"
    >
      <SectionTitle
        badge="Industries"
        title="Industries We Serve"
        subtitle="From logistics to emergency services, DriverGuard AI protects drivers across every industry."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {INDUSTRIES.map((industry, i) => (
          <IndustryCard key={industry.title} industry={industry} index={i} />
        ))}
      </div>
    </section>
  )
})

export default Industries
