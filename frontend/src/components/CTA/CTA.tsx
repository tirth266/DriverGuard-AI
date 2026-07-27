import { memo } from 'react'
import { motion } from 'framer-motion'
import Button from '../Shared/Button'

const CTA = memo(function CTA() {
  return (
    <section
      className="px-4 md:px-16 max-w-[1440px] mx-auto pb-[120px]"
      aria-label="Call to action"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        className="glass-card p-[120px] rounded-[48px] text-center relative overflow-hidden"
      >
        {/* Glow orb */}
        <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          <h2 className="font-display text-[48px] leading-[1.1] tracking-[-0.02em] font-bold text-on-surface mb-8">
            Build Safer Roads with AI
          </h2>
          <p className="text-on-surface-variant text-[18px] leading-[1.6] max-w-xl mx-auto mb-8">
            Join the industry leaders integrating DriverGuard into their next-generation safety stacks.
            Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button variant="primary" size="lg" className="px-10 py-5">
              Request Full Demo
            </Button>
            <Button variant="outline" size="lg" className="px-10 py-5">
              Developer Documentation
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  )
})

export default CTA
