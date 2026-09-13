import { memo } from 'react'
import { motion } from 'framer-motion'
import Hero from '../components/home/Hero'
import TrustBanner from '../components/home/TrustBanner'
import EditorialStatement from '../components/home/EditorialStatement'
import Features from '../components/home/Features'
import Pipeline from '../components/home/Pipeline'
import YoloShowcase from '../components/home/YoloShowcase'
import DetectionGrid from '../components/home/DetectionGrid'
import KPISection from '../components/home/KPISection'
import Industries from '../components/home/Industries'
import Pricing from '../components/home/Pricing'
import FAQ from '../components/home/FAQ'
import CTA from '../components/home/CTA'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 },
}

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.35,
} as const

const Home = memo(function Home() {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="page-wrapper overflow-hidden"
    >
      {/* 1. Hero with line-by-line editorial reveal & CV bounding box */}
      <Hero />

      {/* 2. Trust banner */}
      <TrustBanner />

      {/* 3. Large typography editorial statement */}
      <EditorialStatement />

      {/* 4. Core platform capabilities */}
      <Features />

      {/* 5. Sticky AI Pipeline storytelling */}
      <Pipeline />

      {/* 6. YOLO11 Real-Time Object Detection Showcase */}
      <YoloShowcase />

      {/* 7. Why DriverGuard AI */}
      <DetectionGrid />

      {/* 8. Live animated fleet metrics */}
      <KPISection />

      {/* 9. Fleet industries served */}
      <Industries />

      {/* 10. Fleet pricing plans */}
      <Pricing />

      {/* 11. FAQ with rotating accordion */}
      <FAQ />

      {/* 12. Final Magnetic CTA */}
      <CTA />
    </motion.div>
  )
})

export default Home
