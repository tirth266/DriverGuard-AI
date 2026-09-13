import { useEffect, useState } from 'react'
import { motion, useSpring, useMotionValue } from 'framer-motion'

export default function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false)
  const [cursorState, setCursorState] = useState<'default' | 'button' | 'link' | 'image' | 'card'>('default')

  // Smooth mouse coordinates with spring physics
  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)

  const springConfig = { damping: 32, stiffness: 400, mass: 0.4 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  useEffect(() => {
    // Disable on touch devices or if reduced motion is preferred
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (isTouch || prefersReducedMotion) {
      return
    }

    const onMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
      if (!isVisible) setIsVisible(true)

      // Identify element underneath cursor
      const target = e.target as HTMLElement | null
      if (!target) return

      if (target.closest('button, .magnetic-target, [role="button"]')) {
        setCursorState('button')
      } else if (target.closest('a, [role="link"]')) {
        setCursorState('link')
      } else if (target.closest('video, img, .hero-visual-target')) {
        setCursorState('image')
      } else if (target.closest('.interactive-card')) {
        setCursorState('card')
      } else {
        setCursorState('default')
      }
    }

    const onMouseLeave = () => setIsVisible(false)
    const onMouseEnter = () => setIsVisible(true)

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('mouseenter', onMouseEnter)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mouseenter', onMouseEnter)
    }
  }, [mouseX, mouseY, isVisible])

  if (!isVisible) return null

  // Restrained, engineering-grade cursor variants
  const ringVariants = {
    default: {
      width: 24,
      height: 24,
      backgroundColor: 'transparent',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      scale: 1,
    },
    button: {
      width: 36,
      height: 36,
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      borderColor: 'rgba(59, 130, 246, 0.6)',
      scale: 1.1,
    },
    link: {
      width: 32,
      height: 32,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderColor: 'rgba(255, 255, 255, 0.4)',
      scale: 1.05,
    },
    image: {
      width: 44,
      height: 44,
      backgroundColor: 'rgba(32, 217, 139, 0.06)',
      borderColor: 'rgba(32, 217, 139, 0.5)',
      scale: 1.15,
    },
    card: {
      width: 30,
      height: 30,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      scale: 1.05,
    },
  }

  return (
    <>
      {/* Outer subtle ring */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[99999] rounded-full border border-solid transition-colors duration-150"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        variants={ringVariants}
        animate={cursorState}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      />

      {/* Central crisp precision dot */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[99999] w-1 h-1 bg-white/90 rounded-full"
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />
    </>
  )
}
