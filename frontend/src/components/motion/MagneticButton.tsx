import React, { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
  strength?: number // max translation distance in px (default 6px)
  variant?: 'primary' | 'secondary' | 'glass' | 'outline'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export default function MagneticButton({
  children,
  className = '',
  strength = 6,
  variant = 'primary',
  onClick,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement | null>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Spring physics for natural elastic return
  const springX = useSpring(x, { stiffness: 250, damping: 20 })
  const springY = useSpring(y, { stiffness: 250, damping: 20 })

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Only apply on fine pointers (mouse), not touch
    if (window.matchMedia('(pointer: coarse)').matches) return

    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const distanceX = e.clientX - centerX
    const distanceY = e.clientY - centerY

    // Scale to max limit
    const pullX = (distanceX / (rect.width / 2)) * strength
    const pullY = (distanceY / (rect.height / 2)) * strength

    x.set(pullX)
    y.set(pullY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const variantStyles = {
    primary:
      'bg-primary text-white hover:bg-primary-hover shadow-md hover:shadow-primary/30 border border-primary/20 hover:border-primary/50',
    secondary:
      'bg-surface/80 text-on-surface hover:bg-card border border-border shadow-sm hover:border-primary/30',
    glass:
      'glass-card text-on-surface hover:border-primary/40 border border-border shadow-sm',
    outline:
      'bg-transparent text-primary hover:bg-primary/10 border border-primary/40 hover:border-primary',
  }

  return (
    <motion.button
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`magnetic-target inline-flex items-center justify-center font-semibold rounded-xl transition-colors duration-200 cursor-pointer select-none ${variantStyles[variant]} ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  )
}
