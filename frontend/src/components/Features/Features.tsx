import { memo } from 'react'
import { motion } from 'framer-motion'
import { Radar, Eye, Cpu, Bell } from 'lucide-react'
import GlassCard from '../Shared/GlassCard'

const FEATURES = [
  {
    icon: Radar,
    title: 'Real-Time Detection',
    description: 'Sub-millisecond latency for instant recognition of safety-critical events.',
    color: 'text-secondary',
  },
  {
    icon: Eye,
    title: 'AI Vision Processing',
    description: 'Advanced infrared processing ensures reliability in total darkness or direct glare.',
    color: 'text-secondary',
  },
  {
    icon: Cpu,
    title: 'YOLOv11 Model',
    description: 'Leveraging the latest object detection architecture for unparalleled precision.',
    color: 'text-secondary',
  },
  {
    icon: Bell,
    title: 'Instant Alerts',
    description: 'Configurable haptic and audio triggers for immediate driver intervention.',
    color: 'text-secondary',
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' },
  }),
}

const Features = memo(function Features() {
  return (
    <section
      className="px-4 md:px-16 max-w-[1440px] mx-auto py-[120px]"
      aria-label="Features section"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {FEATURES.map((feature, i) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={feature.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
            >
              <GlassCard className="p-8 h-full flex flex-col gap-4">
                <Icon
                  size={36}
                  className={feature.color}
                  aria-hidden="true"
                />
                <h3 className="font-headline-md text-[24px] leading-[1.3] font-medium text-on-surface">
                  {feature.title}
                </h3>
                <p className="text-on-surface-variant text-body-md leading-[1.6]">
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
})

export default Features
