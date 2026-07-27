import { memo } from 'react'
import { motion } from 'framer-motion'
import { GitBranch } from 'lucide-react'
import Button from '../Shared/Button'
import GlassCard from '../Shared/GlassCard'

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCcKaLxmdIZwnR0lQmtyJqnulBLej0a0G8kFHVn1alPzu5Bih45tWBAph9k-Y_O-mDBiS96RZ6X6Pm6niij5B-CplXhXHUVFwTuaIm9ON1SnuBg7edeuTBmwyT-UrudvWqkJQYfwkRmLV4JkTFdmL0Za-_fIa5CC0_p2urfVKpFZ5yHicpcA_Xzpw1Baf5ENstaxctcRb9e5Ob1HFkQ9ZCUPonuqkQZT2f-2yawldUCYahojUrdLzzydNygLW_VYW37cVHmdtONPi4'

const fadeInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } },
}

const fadeInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut', delay: 0.15 } },
}

const slideUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: 'easeOut' },
  }),
}

const Hero = memo(function Hero() {
  return (
    <section
      className="min-h-[80vh] flex items-center px-4 md:px-16 max-w-[1440px] mx-auto py-[120px]"
      aria-label="Hero section"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center w-full">
        {/* Left: Text content */}
        <motion.div
          variants={fadeInLeft}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Live badge */}
          <motion.div
            custom={0}
            variants={slideUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card border border-primary/20"
          >
            <span className="w-2 h-2 rounded-full bg-secondary pulse-dot block" />
            <span className="font-label-caps text-label-caps text-secondary tracking-[0.05em] uppercase">
              AI Powered Driver Monitoring
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            custom={1}
            variants={slideUp}
            initial="hidden"
            animate="visible"
            className="font-display text-[48px] leading-[1.1] tracking-[-0.02em] font-bold text-on-surface"
          >
            Real-Time Driver <br />
            <span className="text-primary">Distraction Detection</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            custom={2}
            variants={slideUp}
            initial="hidden"
            animate="visible"
            className="text-body-lg text-on-surface-variant max-w-lg leading-[1.6]"
          >
            Empower your fleet with advanced AI vision. DriverGuard AI monitors vigilance, detects drowsiness, and identifies distractions in milliseconds to prevent accidents before they happen.
          </motion.p>

          {/* CTAs */}
          <motion.div
            custom={3}
            variants={slideUp}
            initial="hidden"
            animate="visible"
            className="flex gap-4 flex-wrap"
          >
            <Button variant="primary" size="lg" aria-label="Try the DriverGuard AI demo">
              Try Demo
            </Button>
            <Button variant="glass" size="lg" className="flex items-center gap-2" aria-label="View source on GitHub">
              <GitBranch size={16} />
              View GitHub
            </Button>
          </motion.div>
        </motion.div>

        {/* Right: Hero image with floating cards */}
        <motion.div
          variants={fadeInRight}
          initial="hidden"
          animate="visible"
          className="relative mt-12 md:mt-0"
        >
          <GlassCard glow className="rounded-xl overflow-hidden">
            <img
              src={HERO_IMAGE}
              alt="AI driver monitoring system showing infrared camera feed with green bounding boxes and real-time data visualizations"
              className="w-full aspect-video object-cover opacity-80"
              loading="eager"
            />
          </GlassCard>

          {/* Floating accuracy card — top right */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, type: 'spring' }}
            className="absolute -top-6 -right-4 md:-right-6 glass-card p-4 rounded-lg flex flex-col gap-1"
            aria-label="Accuracy metric"
          >
            <span className="font-label-caps text-label-caps text-secondary tracking-[0.05em] uppercase">
              ACCURACY
            </span>
            <span className="font-metric text-[28px] leading-none tracking-[-0.01em] font-bold text-on-surface">
              96.8%
            </span>
          </motion.div>

          {/* Floating stats card — bottom left */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5, type: 'spring' }}
            className="absolute -bottom-10 left-4 md:left-10 glass-card p-4 rounded-lg flex items-center gap-4"
            aria-label="Model architecture and training info"
          >
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-on-surface-variant tracking-[0.05em] uppercase">
                ARCHITECTURE
              </span>
              <span className="text-headline-md font-medium text-primary">YOLOv11</span>
            </div>
            <div className="h-10 w-px bg-white/10 mx-2" />
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-on-surface-variant tracking-[0.05em] uppercase">
                TRAINING SET
              </span>
              <span className="text-headline-md font-medium text-on-surface">100K+ IMAGES</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
})

export default Hero
