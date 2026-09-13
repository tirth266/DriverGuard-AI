import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield } from 'lucide-react'

export default function PageLoader() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Dismiss quickly (~750ms) to ensure snappy, non-blocking entrance
    const timer = setTimeout(() => {
      setLoading(false)
    }, 750)

    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="driverguard-page-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[999999] bg-black flex flex-col items-center justify-center pointer-events-none select-none"
        >
          {/* Subtle central glow */}
          <div className="absolute w-72 h-72 bg-primary/10 rounded-full blur-3xl" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative z-10 flex flex-col items-center gap-3"
          >
            <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Shield size={26} />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base">
                DriverGuard <span className="text-primary font-normal">AI</span>
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] uppercase font-mono tracking-widest text-white/50">
                INITIALIZING AI CABIN GUARD
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
