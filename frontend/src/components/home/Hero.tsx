import { memo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../shared/Button'
import GlassCard from '../shared/Card'
import { use3DTilt } from '../../hooks/use3DTilt'

const HERO_POSTER =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCcKaLxmdIZwnR0lQmtyJqnulBLej0a0G8kFHVn1alPzu5Bih45tWBAph9k-Y_O-mDBiS96RZ6X6Pm6niij5B-CplXhXHUVFwTuaIm9ON1SnuBg7edeuTBmwyT-UrudvWqkJQYfwkRmLV4JkTFdmL0Za-_fIa5CC0_p2urfVKpFZ5yHicpcA_Xzpw1Baf5ENstaxctcRb9e5Ob1HFkQ9ZCUPonuqkQZT2f-2yawldUCYahojUrdLzzydNygLW_VYW37cVHmdtONPi4'

const Hero = memo(function Hero() {
  const tiltProps = use3DTilt({ maxRotation: 5, scale: 1.01 })

  return (
    <section
      className="min-h-[80vh] flex items-center px-4 md:px-16 max-w-[1440px] mx-auto py-[100px] md:py-[120px] bg-background text-on-surface"
      aria-label="Hero section"
      id="solutions"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
        
        {/* Left: Staggered entrance content */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.12 },
            },
          }}
          className="space-y-8"
        >
          {/* Badge */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
            }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-card border border-border shadow-sm hover:border-primary/30 transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse flex-shrink-0" />
            <span className="font-label-caps text-label-caps text-primary tracking-[0.05em] uppercase font-semibold text-xs">
              Trusted AI Fleet Safety Platform
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
            }}
            className="font-display text-[40px] md:text-[54px] leading-[1.1] tracking-[-0.02em] font-extrabold text-on-surface"
          >
            Protect Every Journey <br />
            <span className="text-gradient-primary">with Intelligent Driver Monitoring</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
            }}
            className="text-body-lg text-on-surface-variant max-w-lg leading-[1.7]"
          >
            DriverGuard AI helps fleets reduce accidents by detecting fatigue, phone usage,
            distracted driving, smoking, and unsafe behaviors in real time — keeping drivers
            safe on every trip.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
            }}
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

        {/* Right: Floating Card with 3D Tilt Cursor Interaction */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mt-8 md:mt-0"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              ref={tiltProps.ref}
              style={tiltProps.style}
              onMouseMove={tiltProps.onMouseMove}
              onMouseLeave={tiltProps.onMouseLeave}
              className="cursor-pointer"
            >
              <GlassCard className="rounded-3xl overflow-hidden border border-border shadow-2xl bg-card relative group">
                <video
                  src="/driver-video.mp4"
                  poster={HERO_POSTER}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full aspect-video object-cover"
                  aria-label="AI-powered driver monitoring system showing real-time safety analysis inside a vehicle cabin"
                />

                {/* Subtle animated scanning laser line */}
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/70 to-transparent pointer-events-none"
                  animate={{ top: ['4%', '92%', '4%'] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                />

                {/* Minimal AI Bounding box on video */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity"
                  viewBox="0 0 500 350"
                  preserveAspectRatio="none"
                >
                  <rect x="160" y="30" width="180" height="170" fill="none" stroke="currentColor" className="text-primary" strokeWidth="1" strokeDasharray="4,4" />
                  <line x1="160" y1="30" x2="180" y2="30" stroke="currentColor" className="text-primary" strokeWidth="2" />
                  <line x1="160" y1="30" x2="160" y2="50" stroke="currentColor" className="text-primary" strokeWidth="2" />
                  <line x1="340" y1="30" x2="320" y2="30" stroke="currentColor" className="text-primary" strokeWidth="2" />
                  <line x1="340" y1="30" x2="340" y2="50" stroke="currentColor" className="text-primary" strokeWidth="2" />
                </svg>
              </GlassCard>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  )
})

export default Hero
