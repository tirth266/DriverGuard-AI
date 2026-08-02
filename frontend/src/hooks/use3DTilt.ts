import { useState, useCallback, useRef, type MouseEvent } from 'react'

interface TiltOptions {
  maxRotation?: number // max rotation degrees (default 6deg)
  scale?: number       // scale on hover (default 1.02)
}

export function use3DTilt({ maxRotation = 6, scale = 1.02 }: TiltOptions = {}) {
  const [style, setStyle] = useState<{
    transform: string
    transition: string
    transformStyle: 'preserve-3d'
  }>({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    transition: 'transform 400ms cubic-bezier(0.03, 0.98, 0.52, 0.99)',
    transformStyle: 'preserve-3d',
  })

  const ref = useRef<HTMLDivElement | null>(null)

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      // Check prefers-reduced-motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const rX = ((mouseY / height) - 0.5) * -2 * maxRotation
      const rY = ((mouseX / width) - 0.5) * 2 * maxRotation

      setStyle({
        transform: `perspective(1000px) rotateX(${rX.toFixed(2)}deg) rotateY(${rY.toFixed(2)}deg) scale3d(${scale}, ${scale}, 1)`,
        transition: 'transform 100ms ease-out',
        transformStyle: 'preserve-3d',
      })
    },
    [maxRotation, scale]
  )

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 400ms cubic-bezier(0.03, 0.98, 0.52, 0.99)',
      transformStyle: 'preserve-3d',
    })
  }, [])

  return { ref, style, onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave }
}
