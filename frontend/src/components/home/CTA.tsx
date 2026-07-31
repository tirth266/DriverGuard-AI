import { memo } from 'react'
import { motion } from 'framer-motion'
import Button from '../shared/Button'
import GlassCard from '../shared/Card'

const CTA = memo(function CTA() {
  return (
    <section
      className="px-4 md:px-16 max-w-[1440px] mx-auto py-[100px] bg-background"
      aria-label="Call to action"
      id="contact"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      >
        <GlassCard className="p-12 md:p-[90px] rounded-[36px] text-center relative overflow-hidden border border-border shadow-lg">
          {/* Subtle Glow orbs */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-400/10 blur-[80px] rounded-full" />
          </div>

          <div className="relative z-10">
            <h2 className="font-display text-[36px] md:text-[50px] leading-[1.1] tracking-[-0.02em] font-extrabold text-on-surface mb-6">
              Ready to Make Every Journey Safer?
            </h2>
            <p className="text-on-surface-variant text-[18px] leading-[1.6] max-w-xl mx-auto mb-10">
              Book a personalized demo and see DriverGuard AI in action.
              Discover how intelligent driver monitoring can transform your fleet safety.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button variant="primary" size="lg" className="px-10 py-5">
                Book Demo
              </Button>
              <Button variant="secondary" size="lg" className="px-10 py-5">
                Talk to Sales
              </Button>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </section>
  )
})

export default CTA
