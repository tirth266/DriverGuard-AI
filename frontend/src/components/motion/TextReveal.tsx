import { motion } from 'framer-motion'

interface TextRevealProps {
  children: string | string[]
  className?: string
  delay?: number
  stagger?: number
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div'
}

export default function TextReveal({
  children,
  className = '',
  delay = 0,
  stagger = 0.12,
  as: Component = 'div',
}: TextRevealProps) {
  const lines = Array.isArray(children) ? children : children.split('\n')

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  }

  const lineVariants = {
    hidden: {
      y: 40,
      opacity: 0,
      filter: 'blur(4px)',
    },
    visible: {
      y: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.65,
        ease: [0.16, 1, 0.3, 1] as const, // Editorial snappy deceleration
      },
    },
  }

  return (
    <Component className={className}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="overflow-hidden"
      >
        {lines.map((line, idx) => (
          <div key={idx} className="overflow-hidden">
            <motion.div variants={lineVariants} className="inline-block w-full">
              {line}
            </motion.div>
          </div>
        ))}
      </motion.div>
    </Component>
  )
}
