import { memo } from 'react'
import { motion } from 'framer-motion'
import Hero from '../components/home/Hero'
import TrustBanner from '../components/home/TrustBanner'
import Features from '../components/home/Features'
import Pipeline from '../components/home/Pipeline'
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
      className="page-wrapper"
    >
      <Hero />
      <TrustBanner />
      <Features />
      <Pipeline />
      <DetectionGrid />
      <KPISection />
      <Industries />
      <Pricing />
      <FAQ />
      <CTA />
    </motion.div>
  )
})

export default Home
