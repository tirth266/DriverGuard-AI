import { memo } from 'react'
import { motion } from 'framer-motion'
import Hero from '../../components/Hero/Hero'
import Features from '../../components/Features/Features'
import DetectionGrid from '../../components/DetectionGrid/DetectionGrid'
import Pipeline from '../../components/Pipeline/Pipeline'
import KPICards from '../../components/KPICards/KPICards'
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
      <Features />
      <DetectionGrid />
      <Pipeline />
      <KPICards />
      <CTA />
    </motion.div>
  )
})

export default Home
