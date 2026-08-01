import { memo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, ShieldCheck } from 'lucide-react'
import Button from '../shared/Button'
import GlassCard from '../shared/Card'

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCcKaLxmdIZwnR0lQmtyJqnulBLej0a0G8kFHVn1alPzu5Bih45tWBAph9k-Y_O-mDBiS96RZ6X6Pm6niij5B-CplXhXHUVFwTuaIm9ON1SnuBg7edeuTBmwyT-UrudvWqkJQYfwkRmLV4JkTFdmL0Za-_fIa5CC0_p2urfVKpFZ5yHicpcA_Xzpw1Baf5ENstaxctcRb9e5Ob1HFkQ9ZCUPonuqkQZT2f-2yawldUCYahojUrdLzzydNygLW_VYW37cVHmdtONPi4'

const STATUS_ITEMS = [
  { label: 'Driver Focused', status: true },
  { label: 'Seat Belt', status: true },
  { label: 'Phone Usage', status: false },
  { label: 'Fatigue', status: false },
  { label: 'Eyes on Road', status: true },
]

const Hero = memo(function Hero() {
  return (
    <section
      className="min-h-[80vh] flex items-center px-4 md:px-16 max-w-[1440px] mx-auto py-[100px] md:py-[120px] bg-background text-on-surface"
      aria-label="Hero section"
      id="solutions"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full">
        {/* Left: Text content */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="space-y-8"
        >
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot block" />
            <span className="font-label-caps text-label-caps text-primary tracking-[0.05em] uppercase font-semibold">
              Trusted AI Fleet Safety Platform
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="font-display text-[40px] md:text-[54px] leading-[1.1] tracking-[-0.02em] font-extrabold text-on-surface"
          >
            Protect Every Journey <br />
            <span className="text-gradient-primary">with Intelligent Driver Monitoring</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="text-body-lg text-on-surface-variant max-w-lg leading-[1.7]"
          >
            DriverGuard AI helps fleets reduce accidents by detecting fatigue, phone usage,
            distracted driving, smoking, and unsafe behaviors in real time — keeping drivers
            safe on every trip.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3 }}
            className="flex gap-4 flex-wrap"
          >
            <Link to="/auth">
              <Button variant="primary" size="lg" aria-label="Get started for free">
                Get Started Free
              </Button>
            </Link>
            <Link to="/enterprise">
              <Button variant="secondary" size="lg" aria-label="View business fleet plans">
                Business Plans
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Right: Hero image with floating cards */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative mt-8 md:mt-0"
        >
          <GlassCard className="rounded-2xl overflow-hidden border border-border shadow-md bg-card">
            <img
              src={HERO_IMAGE}
              alt="AI-powered driver monitoring system showing real-time safety analysis inside a vehicle cabin"
              className="w-full aspect-video object-cover"
              loading="eager"
            />
          </GlassCard>

          {/* Floating LIVE STATUS card — top right */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, type: 'spring' }}
            className="absolute -top-4 -right-2 md:-right-4 bg-card p-4 rounded-xl shadow-lg border border-border"
            aria-label="Live driver status"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot block" />
              <span className="font-label-caps text-[10px] text-emerald-600 dark:text-emerald-400 tracking-[0.08em] uppercase font-bold">
                Live Status
              </span>
            </div>
            <div className="space-y-1.5">
              {STATUS_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-on-surface-variant font-medium">{item.label}</span>
                  {item.status ? (
                    <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-red-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Floating Safety Score card — bottom left */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5, type: 'spring' }}
            className="absolute -bottom-8 left-4 md:left-8 bg-card p-5 rounded-xl flex items-center gap-4 shadow-lg border border-border"
            aria-label="Safety score"
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ShieldCheck className="text-primary" size={24} />
            </div>
            <div>
              <span className="font-label-caps text-[10px] text-on-surface-variant tracking-[0.05em] uppercase block font-semibold">
                Safety Score
              </span>
              <span className="font-metric text-[32px] leading-none tracking-[-0.01em] font-bold text-on-surface">
                98<span className="text-primary text-[18px] font-medium">/100</span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
})

export default Hero
