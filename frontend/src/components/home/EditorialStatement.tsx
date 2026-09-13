import { memo, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const EditorialStatement = memo(function EditorialStatement() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  // Subtle horizontal drift on scroll without layout shift
  const x1 = useTransform(scrollYProgress, [0, 1], [-25, 25])
  const x2 = useTransform(scrollYProgress, [0, 1], [25, -25])

  return (
    <section
      ref={containerRef}
      className="py-20 md:py-28 overflow-hidden bg-surface/30 border-y border-border/60 relative select-none"
      aria-label="Core Philosophy"
    >
      <div className="max-w-[1440px] mx-auto px-4 md:px-16 flex flex-col gap-3">
        
        {/* Row 1 */}
        <motion.div
          style={{ x: x1 }}
          className="whitespace-nowrap font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] text-on-surface/90"
        >
          DETECT. <span className="text-primary font-bold">UNDERSTAND.</span> PROTECT.
        </motion.div>

        {/* Row 2 */}
        <motion.div
          style={{ x: x2 }}
          className="whitespace-nowrap font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] text-on-surface-variant/40"
        >
          AI THAT WATCHES WHEN YOU CAN'T.
        </motion.div>

      </div>
    </section>
  )
})

export default EditorialStatement
