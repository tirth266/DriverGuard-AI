import { memo } from 'react'
import { motion } from 'framer-motion'
import Hero from '../../components/Hero/Hero'
import TrustBanner from '../../components/TrustBanner/TrustBanner'
import Features from '../../components/Features/Features'
import Pipeline from '../../components/Pipeline/Pipeline'
import DetectionGrid from '../../components/DetectionGrid/DetectionGrid'
import KPICards from '../../components/KPICards/KPICards'
import Industries from '../../components/Industries/Industries'
import Testimonials from '../../components/Testimonials/Testimonials'
import Pricing from '../../components/Pricing/Pricing'
import FAQ from '../../components/FAQ/FAQ'
import CTA from '../../components/CTA/CTA'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 },
}

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.35,
}

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
      <KPICards />
      <Industries />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
    </motion.div>
  )
})

export default Home
