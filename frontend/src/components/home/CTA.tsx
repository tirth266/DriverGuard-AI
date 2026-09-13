import { memo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Shield } from 'lucide-react'
import MagneticButton from '../motion/MagneticButton'

const CTA = memo(function CTA() {
  return (
    <section
      className="px-4 md:px-16 max-w-[1440px] mx-auto py-24 md:py-32 bg-background relative"
      aria-label="Call to action"
      id="contact"
    >
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-[36px] border border-border/80 bg-card p-10 md:p-20 text-center overflow-hidden shadow-2xl"
      >
        {/* Subtle Atmospheric Radial Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border text-xs font-mono text-primary font-bold">
            <Shield size={14} />
            <span>DEPLOY IN UNDER 30 MINUTES</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-[-0.03em] text-on-surface leading-[1.1]">
            Ready to Protect Every Mile?
          </h2>

          <p className="text-on-surface-variant text-base md:text-lg leading-relaxed max-w-lg mx-auto">
            Join forward-thinking commercial fleets protecting drivers with real-time YOLO11
            object detection and proactive safety intervention.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link to="/auth">
              <MagneticButton
                variant="primary"
                strength={8}
                className="px-8 py-4 text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/25"
              >
                <span>Get Started Free</span>
                <ArrowRight size={16} />
              </MagneticButton>
            </Link>

            <Link to="/enterprise">
              <MagneticButton
                variant="secondary"
                strength={6}
                className="px-8 py-4 text-sm font-semibold"
              >
                Schedule Fleet Demo
              </MagneticButton>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  )
})

export default CTA
